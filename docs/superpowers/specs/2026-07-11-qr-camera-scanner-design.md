# QR Camera Scanner — Design Spec

**Date:** 2026-07-11
**Status:** Approved

## Context

The check-in panel (`apps/owner/app/(app)/checkins/register-panel.tsx`) has a QR tab with a text input optimised for hardware wedge scanners. On tablets and phones (the primary PWA target), staff have no wedge scanner — they need to scan member QR codes using the device camera.

## Goal

Add a camera scan button to the QR tab that opens a camera feed, detects the member's QR code, and auto-submits the check-in — zero extra taps after detection.

## Non-goals

- No changes to the manual check-in tab.
- No changes to the existing wedge-scanner / keyboard flow.
- No changes to backend or API contract.
- No PWA manifest / service worker work (out of scope here).

## Library

**`qr-scanner`** (npm). ~50 KB. Wraps the native `BarcodeDetector` API where available (Chrome/Android — native speed) and falls back to a bundled WASM decoder on Safari/Firefox. Covers iOS Safari, which is the primary PWA runtime.

## Token Parsing

The QR code format is not yet defined in the API contract. We treat the scanned string as follows:

1. If it starts with `http`, parse as URL and extract `?token=` query param.
2. Otherwise use the raw scanned string as the `qr_token`.

This is forward-compatible: when the backend defines the format, only this one parsing line changes.

## New File

**`apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx`**

A self-contained client component. Props: `onDetected: (token: string) => void`.

Behaviour:
- Controlled by local `open` boolean state.
- Trigger: a camera icon `<Button variant="outline" size="icon">` rendered inside `QrForm`, to the right of the token input.
- On open: mounts a `<video>` element, calls `QrScanner.start()`.
- On detection: extracts token via the parsing rule above, calls `onDetected(token)`, then closes (which stops the camera).
- On close without detection: calls `QrScanner.stop()` in a cleanup effect.
- Camera permission denied: shows an inline message inside the dialog (via i18n key `qr.cameraError`) — no crash, no toast.
- Uses shadcn `<Dialog>` / `<DialogContent>` — centered modal on all screen sizes, which works fine for tablet. A `Drawer` (vaul) could be added later for phone-first if needed.

## Changes to `QrForm` (register-panel.tsx)

- Add camera icon button to the right of the existing token input (inside the `relative` wrapper div).
- `onDetected` callback: `form.setValue('qr_token', token)` → `form.handleSubmit(onSubmit)()`.
- Dialog is rendered adjacent to the `<FormItem>`, outside the input wrapper.
- No other changes to `QrForm`.

## Camera Button Placement

```
[ 🔍 token input field          ] [ 📷 ]
```

The camera button sits at the trailing edge of the input row, matching the leading QR icon on the left. Both are the same `size-5` / `size-11` height.

## Error States

| Scenario | Handling |
|---|---|
| Camera permission denied | Inline message inside dialog; dialog stays open so staff can close manually |
| No camera on device | `QrScanner` constructor throws — catch and show same inline message |
| QR code not recognised after timeout | No auto-close; staff close manually and use keyboard field |
| Scan fires while check-in is pending | `onDetected` fires but `onSubmit` guards with `if (checkInViaQr.isPending) return` (existing guard) |

## Dependencies

- Add `qr-scanner` to `apps/owner/package.json`.
- No other package changes.

## Files Touched

| File | Change |
|---|---|
| `apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx` | New — camera dialog component |
| `apps/owner/app/(app)/checkins/register-panel.tsx` | Add camera button + wire `onDetected` callback |
| `apps/owner/package.json` | Add `qr-scanner` dependency |
| `apps/owner/messages/fr.json` | Add `frontdesk.qr.scanButton` and `frontdesk.qr.cameraError` keys |
| `apps/owner/messages/en.json` | Same keys in English |
