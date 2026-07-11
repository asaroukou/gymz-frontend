'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';

interface QrScannerDialogProps {
  onDetected: (token: string) => void;
  disabled?: boolean;
}

function parseToken(raw: string): string {
  if (raw.startsWith('http')) {
    try {
      return new URL(raw).searchParams.get('token') ?? raw;
    } catch {
      return raw;
    }
  }
  return raw;
}

export function QrScannerDialog({ onDetected, disabled }: QrScannerDialogProps) {
  const t = useTranslations('frontdesk');
  const [open, setOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Hold latest callback in a ref so the scanner closure never goes stale
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  useEffect(() => {
    if (!open || !videoRef.current) return;
    const video = videoRef.current;
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | null = null;
    let isMounted = true;

    import('qr-scanner').then(({ default: QrScanner }) => {
      if (!isMounted) return; // dialog closed before import resolved
      // Point to the worker we copied into public/
      QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

      scanner = new QrScanner(
        video,
        (result: { data: string }) => {
          const token = parseToken(result.data);
          setOpen(false);
          onDetectedRef.current(token);
        },
        { returnDetailedScanResult: true, highlightScanRegion: true },
      );

      scanner.start().catch(() => {
        setCameraError(t('qr.cameraError'));
      });
    });

    return () => {
      isMounted = false;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open, t]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setCameraError(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={t('qr.scanButton')}
        >
          <CameraIcon className="size-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('qr.scanButton')}</DialogTitle>
        </DialogHeader>
        {cameraError ? (
          <p className="text-sm text-destructive">{cameraError}</p>
        ) : (
          <video ref={videoRef} className="w-full rounded-lg" />
        )}
      </DialogContent>
    </Dialog>
  );
}
