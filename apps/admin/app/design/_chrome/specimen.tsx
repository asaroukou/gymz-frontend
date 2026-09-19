import type { ReactNode } from 'react';

/**
 * One pane. The "sombre" pane carries a `.dark` wrapper for symmetry with the
 * comparison layout; the app itself ships no dark theme, so nothing else
 * currently keys off that class. The inner div paints `bg-background` so
 * each pane shows its own surface rather than the muted field behind the
 * chrome.
 *
 * `color-scheme` is set alongside the class, per pane, for the same reason
 * force-light.tsx pins it on `<html>`: native UA chrome (number input
 * spinners, the Table primitive's scrollbar) follows `color-scheme`, not any
 * class. Leaving the "sombre" pane's `color-scheme` at the page's `light`
 * would make that native chrome identical in both panes despite the label.
 */
function Pane({ label, dark, children }: { label: string; dark?: boolean; children: ReactNode }) {
  return (
    <div
      className={dark ? 'dark min-w-0' : 'min-w-0'}
      style={{ colorScheme: dark ? 'dark' : 'light' }}
    >
      <div className="flex h-full flex-col bg-background">
        <p className="border-b border-border px-3 py-1.5 font-numeric text-[10px] tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <div className="flex flex-1 flex-wrap items-center gap-3 p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Identification on the left, the same children rendered twice on the right.
 * `signature` is the prop combination being shown, in font-numeric, so a reader can go
 * straight from the specimen to the call site.
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

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <Pane label="clair">{children}</Pane>
        <Pane label="sombre" dark>
          {children}
        </Pane>
      </div>
    </div>
  );
}
