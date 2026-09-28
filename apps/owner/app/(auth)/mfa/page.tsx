'use client';

import { Suspense, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftIcon, CircleAlertIcon, CopyIcon, ShieldCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { formatSecret } from '@iziwellpass/auth/totp';
import { Button } from '@iziwellpass/ui/components/button';

import { AuthCard } from '@/components/auth-card';
import { AuthCardSkeleton } from '@/components/auth-card-skeleton';
import { CodeInput } from '@/components/auth/code-input';
import { TotpQr } from '@/components/auth/totp-qr';
import { sanitizeNext } from '@/lib/next-path';
import { CODE_LENGTH } from '@/lib/totp-code';
import { useMfaEnrolment } from '@/lib/use-mfa-enrolment';

function SetupView({ secret, uri, onContinue }: { secret: string; uri: string; onContinue: () => void }) {
  const t = useTranslations('mfa');
  const keyRef = useRef<HTMLParagraphElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(t('setup.copied'));
    } catch {
      // Clipboard blocked: select the key so it can be copied by hand instead.
      const el = keyRef.current;
      if (el) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };
  return (
    <AuthCard
      title={t('setup.title')}
      subtitle={t('setup.intro')}
      footer={<p className="text-sm">{t('setup.footnote')}</p>}
    >
      <div className="grid gap-7">
        <TotpQr uri={uri} label={t('setup.qrAlt')} />
        <div className="grid gap-2">
          <p id="mfa-key-label" className="text-sm font-medium text-muted-foreground">
            {t('setup.manualLabel')}
          </p>
          <div className="flex items-start gap-2">
            <p
              ref={keyRef}
              aria-labelledby="mfa-key-label"
              className="flex min-h-12 min-w-0 flex-1 items-center rounded-3xl bg-side px-[18px] py-3 text-[15px] leading-6 font-medium tracking-wide break-words select-all"
            >
              {formatSecret(secret)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              aria-label={t('setup.copy')}
              onClick={() => void copy()}
            >
              <CopyIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={onContinue}>
          {t('setup.continue')}
        </Button>
      </div>
    </AuthCard>
  );
}

function VerifyView({
  busy,
  codeError,
  onVerify,
  onBack,
}: {
  busy: boolean;
  codeError: 'invalid' | 'other' | null;
  onVerify: (code: string) => void;
  onBack: () => void;
}) {
  const t = useTranslations('mfa');
  const tAuth = useTranslations('auth');
  const [code, setCode] = useState('');
  // The view remounts on every refused code (key = attempt); typing hides the
  // previous refusal, as on the login code step.
  const [errorShown, setErrorShown] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const message = !errorShown
    ? null
    : codeError === 'invalid'
      ? tAuth('errors.codeMismatchTotp')
      : codeError === 'other'
        ? t('verify.error')
        : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === CODE_LENGTH) onVerify(code);
  };

  return (
    <AuthCard title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <form onSubmit={onSubmit} className="grid gap-7">
        <div className="grid gap-2.5">
          <CodeInput
            inputRef={inputRef}
            value={code}
            onChange={(value) => {
              setCode(value);
              setErrorShown(false);
            }}
            onComplete={onVerify}
            invalid={Boolean(message)}
            disabled={busy}
            label={tAuth('totp.codeLabel')}
            describedBy={message ? 'mfa-code-error' : undefined}
            autoFocus
          />
          {message ? (
            <p
              id="mfa-code-error"
              role="alert"
              className="text-center text-sm text-destructive-foreground"
            >
              <CircleAlertIcon
                aria-hidden="true"
                strokeWidth={1.5}
                className="mr-1.5 inline size-3.5 align-[-2px]"
              />
              {message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={busy || code.length < CODE_LENGTH}>
          {busy ? t('verify.finalizing') : t('verify.submit')}
        </Button>
        {busy ? null : (
          <Button type="button" variant="ghost" className="mx-auto text-muted-foreground" onClick={onBack}>
            <ArrowLeftIcon aria-hidden="true" />
            {t('verify.back')}
          </Button>
        )}
      </form>
    </AuthCard>
  );
}

function MfaView() {
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get('next'));
  const t = useTranslations('mfa');
  const { state, retrySetup, toVerify, backToSetup, verify, retryFinalize, signInAgain } =
    useMfaEnrolment({ next });

  switch (state.step) {
    case 'loading':
      return <AuthCardSkeleton />;
    case 'setupError':
      return (
        <AuthCard title={t('setup.title')}>
          <div className="grid gap-4">
            <p role="alert" className="text-center text-sm text-destructive-foreground">
              {t('setup.error')}
            </p>
            <Button type="button" variant="secondary" className="w-full" onClick={retrySetup}>
              {t('retry')}
            </Button>
          </div>
        </AuthCard>
      );
    case 'setup':
      return (
        <SetupView
          secret={state.setup!.secret}
          uri={state.setup!.otpauthUri}
          onContinue={toVerify}
        />
      );
    case 'verify':
    case 'finalizing':
      // Finalizing without a secret was reached straight from loading because
      // Cognito already had TOTP enabled: nothing to type, only finalize runs.
      if (!state.setup) return <AuthCardSkeleton />;
      return (
        <VerifyView
          key={state.attempt}
          busy={state.step === 'finalizing'}
          codeError={state.codeError}
          onVerify={(code) => void verify(code)}
          onBack={backToSetup}
        />
      );
    case 'finalizeError':
      return (
        <AuthCard title={t('verify.title')}>
          <div className="grid gap-4">
            <p role="alert" className="text-center text-sm text-destructive-foreground">
              {t('finalize.error')}
            </p>
            <Button type="button" className="w-full" onClick={() => void retryFinalize()}>
              {t('retry')}
            </Button>
          </div>
        </AuthCard>
      );
    case 'done':
      return (
        <AuthCard
          media={<ShieldCheckIcon />}
          mediaTone="vert"
          title={t('done.title')}
          subtitle={t('done.body')}
        >
          <Button type="button" className="w-full" onClick={signInAgain}>
            {t('done.cta')}
          </Button>
        </AuthCard>
      );
  }
}

export default function MfaPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <MfaView />
    </Suspense>
  );
}
