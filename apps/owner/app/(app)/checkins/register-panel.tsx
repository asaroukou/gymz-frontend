'use client';

import { useEffect, useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { QrCodeIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  getGetAttendanceQueryKey,
  getListCheckInsQueryKey,
  useCheckInManual,
  useCheckInViaQr,
} from '@iziwellpass/api/generated';
import type { Member } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

import type { QueryLike } from './use-frontdesk-data';

function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

type Translate = ReturnType<typeof useTranslations>;

/**
 * Success toast with the member's name when it can be resolved from the loaded
 * member list (`checked-in member_id` → name), falling back to a name-less
 * confirmation for QR self check-ins of members not in the cache.
 */
function checkinSuccessToast(t: Translate, memberById: Map<string, Member>, memberId: string) {
  const member = memberById.get(memberId);
  toast.success(member ? t('success', { name: memberName(member) }) : t('successNoName'));
}

// ---------------------------------------------------------------------------
// QR / token check-in
// ---------------------------------------------------------------------------

interface QrValues {
  qr_token: string;
}

function QrForm({ venueId, memberById }: { venueId: string; memberById: Map<string, Member> }) {
  const t = useTranslations('frontdesk');
  const queryClient = useQueryClient();
  const checkInViaQr = useCheckInViaQr();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const schema = useMemo(
    () => z.object({ qr_token: z.string().min(1, t('validation.qrRequired')) }),
    [t],
  );

  const form = useForm<QrValues>({
    resolver: zodResolver(schema),
    defaultValues: { qr_token: '' },
  });

  // Scan-ready on arrival: focus the token field on mount so the first scan at
  // a 6:30 rush lands instead of silently no-opping. Radix unmounts inactive
  // tab content, so switching back to the QR tab remounts this and refocuses
  // too. The field is the whole point of this screen, so we don't gate by
  // pointer type (a counter tablet with a wedge scanner needs it as much as a
  // laptop).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onSubmit = (values: QrValues) => {
    // Guard the rapid-Enter loop: native Enter bypasses the disabled button, so
    // a fast second Enter (or a wedge-scanner double-fire) would otherwise
    // re-submit the still-visible token during the in-flight window and trip a
    // spurious "already checked in" error right after the success.
    if (checkInViaQr.isPending) return;
    // Payload kept byte-identical to the pre-redesign page: { qr_token, venue_id }.
    checkInViaQr.mutate(
      { data: { qr_token: values.qr_token, venue_id: venueId } },
      {
        onSuccess: (res) => {
          checkinSuccessToast(t, memberById, res.data.member_id);
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
          // Clear + refocus for rapid repeated scanning at the door.
          form.reset({ qr_token: '' });
          inputRef.current?.focus();
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('error')));
          }
          // Keep the token visible, but refocus so continued scanning doesn't
          // stall if a field error moved focus.
          inputRef.current?.focus();
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t('qr.hint')}</p>
        <FormField
          control={form.control}
          name="qr_token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('qr.label')}</FormLabel>
              <div className="relative">
                <QrCodeIcon
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <FormControl>
                  <Input
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      inputRef.current = el;
                    }}
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={checkInViaQr.isPending}
                    placeholder={t('qr.placeholder')}
                    className="h-11 pl-12"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={checkInViaQr.isPending} className="h-11 w-full">
          {checkInViaQr.isPending ? t('qr.submitting') : t('qr.submit')}
        </Button>
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Manual (booking-driven) check-in
// ---------------------------------------------------------------------------

interface ManualValues {
  member_id: string;
  booking_id: string;
}

/**
 * `ManualCheckinRequest` requires a `booking_id` (UUID) + `venue_id` — the
 * backend resolves the member/method/record from the booking (which must be
 * today's, `confirmed`, at this venue). There is no member→today's-booking
 * lookup endpoint in scope, so the member combobox is only a lookup aid: pick
 * who you're checking in, then paste their booking id (from the planning
 * screen's slot participants). A friendlier member-first flow is tracked as an
 * open backend ticket; this is the cleanest UI over the current calls.
 */
function ManualForm({
  venueId,
  members,
  memberById,
}: {
  venueId: string;
  members: Member[];
  memberById: Map<string, Member>;
}) {
  const t = useTranslations('frontdesk');
  const queryClient = useQueryClient();
  const checkInManual = useCheckInManual();

  const schema = useMemo(
    () =>
      z.object({
        member_id: z.string().min(1, t('validation.memberRequired')),
        booking_id: z.string().min(1, t('validation.bookingRequired')),
      }),
    [t],
  );

  const form = useForm<ManualValues>({
    resolver: zodResolver(schema),
    defaultValues: { member_id: '', booking_id: '' },
  });

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: memberName(m) })),
    [members],
  );

  const onSubmit = (values: ManualValues) => {
    // Guard against a double-submit during the in-flight window (native Enter
    // bypasses the disabled button).
    if (checkInManual.isPending) return;
    // Payload kept byte-identical to the pre-redesign page: { booking_id, venue_id }.
    checkInManual.mutate(
      { data: { booking_id: values.booking_id, venue_id: venueId } },
      {
        onSuccess: (res) => {
          checkinSuccessToast(t, memberById, res.data.member_id);
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
          form.reset({ member_id: '', booking_id: '' });
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('error')));
          }
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
        <FormField
          control={form.control}
          name="member_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('manual.member')}</FormLabel>
              <FormControl>
                <Combobox
                  options={memberOptions}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  placeholder={t('manual.memberPlaceholder')}
                  searchPlaceholder={t('manual.memberSearch')}
                  emptyText={t('manual.noMembers')}
                  disabled={checkInManual.isPending}
                  className="h-11"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t('manual.memberHint')}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="booking_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('manual.booking')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={checkInManual.isPending}
                  placeholder={t('manual.bookingPlaceholder')}
                  className="h-11"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t('manual.bookingHint')}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={checkInManual.isPending} className="h-11 w-full">
          {checkInManual.isPending ? t('manual.submitting') : t('manual.submit')}
        </Button>
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function RegisterPanel({
  venueId,
  members,
}: {
  venueId: string;
  members: QueryLike<Member[]>;
}) {
  const t = useTranslations('frontdesk');
  const list = useMemo(() => members.data ?? [], [members.data]);
  const memberById = useMemo(() => new Map(list.map((m) => [m.id, m])), [list]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('register.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="qr" className="gap-4">
          <TabsList aria-label={t('register.tabsLabel')} className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="h-11 gap-1.5 lg:h-9">
              <QrCodeIcon className="size-4" aria-hidden="true" />
              {t('register.tabQr')}
            </TabsTrigger>
            <TabsTrigger value="manual" className="h-11 lg:h-9">
              {t('register.tabManual')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr">
            <QrForm venueId={venueId} memberById={memberById} />
          </TabsContent>

          <TabsContent value="manual">
            {members.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-11 w-full rounded-full" />
                <Skeleton className="h-11 w-full rounded-full" />
                <Skeleton className="h-11 w-full rounded-full" />
              </div>
            ) : members.isError ? (
              <Alert variant="destructive">
                <AlertTitle>{t('errorTitle')}</AlertTitle>
                <AlertDescription>
                  {apiErrorMessage(members.error, t('manual.membersError'))}
                </AlertDescription>
              </Alert>
            ) : (
              <ManualForm venueId={venueId} members={list} memberById={memberById} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
