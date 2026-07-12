# QR Camera Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a camera scan button to the QR check-in tab that opens the device camera, detects the member's QR code, and auto-submits the check-in with zero extra taps.

**Architecture:** A new `QrScannerDialog` component wraps the `qr-scanner` library in a shadcn `Dialog`. The library is dynamically imported inside `useEffect` (client-only, code-split). `QrForm` in `register-panel.tsx` renders the dialog and wires `onDetected → setValue + handleSubmit`. The existing wedge-scanner/keyboard flow is untouched.

**Tech Stack:** Next.js 15 App Router, React 19, `qr-scanner` (nimiq), shadcn Dialog, next-intl, lucide-react, Tailwind v4.

---

### Context for the implementer

- Working directory: `web/` (pnpm monorepo)
- Owner app: `apps/owner/` — Next.js 15, `'use client'` components
- QR form: `apps/owner/app/(app)/checkins/register-panel.tsx` — `QrForm` component
- i18n: `apps/owner/messages/fr.json` and `en.json`, accessed via `useTranslations('frontdesk')`
- `qr-scanner` needs its Web Worker served statically — copy it to `apps/owner/public/` and set `QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js'` before creating the scanner instance
- No test setup in the owner app — verify with `pnpm typecheck` (run from `apps/owner/`) and manual check in the dev server
- Another agent may be working on the same branch — commit often and pull before starting

---

### Task 1: Install dependency, create public dir, add i18n keys

**Files:**
- Modify: `apps/owner/package.json` (add `qr-scanner`)
- Create: `apps/owner/public/` directory (new — copy worker file here)
- Modify: `apps/owner/messages/fr.json`
- Modify: `apps/owner/messages/en.json`

- [ ] **Step 1: Add `qr-scanner` to the owner app**

In `apps/owner/package.json`, add to `"dependencies"`:

```json
"qr-scanner": "^1.4.2"
```

- [ ] **Step 2: Install**

Run from the workspace root (`web/`):

```bash
pnpm install
```

Expected: lock file updated, `qr-scanner` appears in `apps/owner/node_modules/`.

- [ ] **Step 3: Create the public directory and copy the worker**

```bash
mkdir -p apps/owner/public
cp apps/owner/node_modules/qr-scanner/qr-scanner-worker.min.js apps/owner/public/
```

Expected: `apps/owner/public/qr-scanner-worker.min.js` exists.

- [ ] **Step 4: Add i18n keys — French**

In `apps/owner/messages/fr.json`, find the `"qr"` object inside `"frontdesk"` and add two keys:

Before:
```json
"qr": {
  "label": "Code QR ou jeton",
  "placeholder": "Scannez ou saisissez le code",
  "hint": "Présentez le QR au lecteur, ou saisissez le jeton, puis validez.",
  "submit": "Valider",
  "submitting": "Validation…"
}
```

After:
```json
"qr": {
  "label": "Code QR ou jeton",
  "placeholder": "Scannez ou saisissez le code",
  "hint": "Présentez le QR au lecteur, ou saisissez le jeton, puis validez.",
  "submit": "Valider",
  "submitting": "Validation…",
  "scanButton": "Scanner avec la caméra",
  "cameraError": "Accès à la caméra refusé — utilisez le champ de texte."
}
```

- [ ] **Step 5: Add i18n keys — English**

In `apps/owner/messages/en.json`, same location:

Before:
```json
"qr": {
  "label": "QR code or token",
  "placeholder": "Scan or enter the code",
  "hint": "Present the QR to the reader, or enter the token, then validate.",
  "submit": "Validate",
  "submitting": "Validating…"
}
```

After:
```json
"qr": {
  "label": "QR code or token",
  "placeholder": "Scan or enter the code",
  "hint": "Present the QR to the reader, or enter the token, then validate.",
  "submit": "Validate",
  "submitting": "Validating…",
  "scanButton": "Scan with camera",
  "cameraError": "Camera access denied — use the text field instead."
}
```

- [ ] **Step 6: Typecheck**

```bash
cd apps/owner && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/owner/package.json apps/owner/public/qr-scanner-worker.min.js \
        apps/owner/messages/fr.json apps/owner/messages/en.json \
        pnpm-lock.yaml
git commit -m "feat(checkins): add qr-scanner dependency and i18n keys for camera scan"
```

---

### Task 2: Create QrScannerDialog component

**Files:**
- Create: `apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx`

- [ ] **Step 1: Create the file**

Create `apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx` with the following content:

```tsx
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
    let scanner: { stop: () => void; destroy: () => void } | null = null;

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
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/owner && pnpm typecheck
```

Expected: no errors. If `qr-scanner` has no bundled types, install `@types/qr-scanner` — but the package ships its own types so this shouldn't be needed.

- [ ] **Step 3: Commit**

```bash
git add apps/owner/app/\(app\)/checkins/qr-scanner-dialog.tsx
git commit -m "feat(checkins): add QrScannerDialog camera component"
```

---

### Task 3: Wire camera button into QrForm

**Files:**
- Modify: `apps/owner/app/(app)/checkins/register-panel.tsx`

- [ ] **Step 1: Add the import**

At the top of `register-panel.tsx`, after the existing imports, add:

```tsx
import { QrScannerDialog } from './qr-scanner-dialog';
```

- [ ] **Step 2: Replace the input wrapper in QrForm**

Locate this block in `QrForm` (around line 129–154):

```tsx
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
```

Replace with:

```tsx
<div className="flex gap-2">
  <div className="relative flex-1">
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
  <QrScannerDialog
    disabled={checkInViaQr.isPending}
    onDetected={(token) => {
      form.setValue('qr_token', token);
      void form.handleSubmit(onSubmit)();
    }}
  />
</div>
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/owner && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and verify manually**

```bash
cd apps/owner && pnpm dev
```

Open `http://localhost:3011` and navigate to the check-in page (front desk). On the QR tab:

1. A camera icon button appears to the right of the token input field.
2. Clicking it opens a dialog with a live camera feed.
3. Pointing a QR code at the camera closes the dialog and submits the check-in (success toast appears, recent check-ins list updates).
4. Clicking the X button or outside the dialog closes it without submitting.
5. If camera access is denied, the error message appears inside the dialog.
6. The existing keyboard/wedge-scanner input still works unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/owner/app/\(app\)/checkins/register-panel.tsx
git commit -m "feat(checkins): add camera scan button to QR check-in tab"
```
