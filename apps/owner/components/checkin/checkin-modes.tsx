'use client';

import { useTranslations } from 'next-intl';

import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { QrScannerDialog } from '@/app/(app)/checkins/qr-scanner-dialog';

export type CheckinMode = 'qr' | 'walkin';

/**
 * The pill row under the command bar: two radio-style pills bound to the
 * same mode as the bar's dropdown, plus — desktop only — the camera pill
 * that opens the scanner dialog. A detected token goes straight to `onScan`.
 */
export function CheckinModes({
  mode,
  onModeChange,
  onScan,
  disabled = false,
}: {
  mode: CheckinMode;
  onModeChange: (mode: CheckinMode) => void;
  onScan?: (token: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('frontdesk');
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <Tabs value={mode} onValueChange={(value) => onModeChange(value as CheckinMode)}>
        <TabsList aria-label={t('command.modeMenuLabel')}>
          <TabsTrigger value="qr" disabled={disabled}>
            {t('modes.qr')}
          </TabsTrigger>
          <TabsTrigger value="walkin" disabled={disabled}>
            {t('modes.walkin')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {onScan ? (
        <div className="hidden md:block">
          <QrScannerDialog onDetected={onScan} disabled={disabled} />
        </div>
      ) : null}
    </div>
  );
}
