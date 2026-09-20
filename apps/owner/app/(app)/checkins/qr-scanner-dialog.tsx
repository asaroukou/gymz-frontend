'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type QrScanner from 'qr-scanner';

import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';

interface QrScannerDialogProps {
  onDetected: (token: string) => void;
  disabled?: boolean;
  onClose?: () => void;
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

export function QrScannerDialog({ onDetected, disabled, onClose }: QrScannerDialogProps) {
  const t = useTranslations('frontdesk');
  const [open, setOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Hold latest callback in a ref so the scanner closure never goes stale
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  useEffect(() => {
    if (!open || !videoRef.current) return;
    const video = videoRef.current;
    let scanner: QrScanner | null = null;
    let isMounted = true;

    setLoading(true);
    import('qr-scanner')
      .then(({ default: QrScanner }) => {
        if (!isMounted) return; // dialog closed before import resolved

        scanner = new QrScanner(
          video,
          (result: { data: string }) => {
            const token = parseToken(result.data);
            setOpen(false);
            onDetectedRef.current(token);
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            preferredCamera: 'environment',
          },
        );

        scanner
          .start()
          .then(() => {
            if (isMounted) setLoading(false);
          })
          .catch(() => {
            if (isMounted) setCameraError(t('qr.cameraError'));
            scanner?.destroy();
            scanner = null;
          });
      })
      .catch(() => {
        if (isMounted) setCameraError(t('qr.cameraError'));
      });

    return () => {
      isMounted = false;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open, t]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCameraError(null);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className="h-10 rounded-full px-[18px] text-base font-normal text-muted-foreground hover:text-foreground"
        >
          <CameraIcon aria-hidden="true" />
          {t('qr.scanButton')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-sm"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onClose?.();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('qr.scanButton')}</DialogTitle>
          <DialogDescription>{t('qr.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {cameraError ? (
          <p className="text-sm text-destructive-foreground">{cameraError}</p>
        ) : (
          <>
            {loading && <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />}
            <video ref={videoRef} className={loading ? 'hidden' : 'w-full rounded-lg'} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
