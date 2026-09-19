/**
 * Type-set brand wordmark: a rounded `iW` chip placeholder mark plus the name.
 * Used above the card on the auth and onboarding screens. Monochrome (ink)
 * per the v2 direction — blue stays a secondary accent only.
 */
export function Wordmark() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-primary font-numeric text-sm font-semibold text-primary-foreground"
      >
        iW
      </span>
      <span className="text-base font-[800] tracking-tight">IziWellPass</span>
    </div>
  );
}
