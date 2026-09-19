import type { ReactNode } from 'react';

/**
 * Identification on the left, the specimen itself on the right.
 * `signature` is the prop combination being shown, in font-numeric, so a reader can go
 * straight from the specimen to the call site.
 *
 * The system is light-only, so each specimen is rendered once. The pane paints
 * `bg-background` to show the app's own surface rather than the muted field
 * behind the chrome, and pins `color-scheme: light` because native UA chrome
 * (number input spinners, the Table primitive's scrollbar) follows
 * `color-scheme` rather than any class: a visitor whose OS prefers dark would
 * otherwise get that chrome painted dark inside a light specimen.
 */
export function Specimen({
  name,
  signature,
  note,
  children,
}: {
  name: string;
  signature?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div className="lg:pt-8">
        <p className="font-numeric text-xs text-foreground">{name}</p>
        {signature ? (
          <p className="mt-1 font-numeric text-[10px] break-words">{signature}</p>
        ) : null}
        {note ? <p className="mt-2 max-w-[42ch] text-xs leading-5">{note}</p> : null}
      </div>

      <div
        className="overflow-hidden rounded-lg border border-border bg-background"
        style={{ colorScheme: 'light' }}
      >
        <div className="flex flex-wrap items-center gap-3 p-4">{children}</div>
      </div>
    </div>
  );
}
