import type { ReactNode } from 'react';

/**
 * One pane. The dark pane is a `.dark` wrapper: the class re-declares the token
 * custom properties for its subtree, and because the ambient page is light
 * (see force-light.tsx) it is also the only place where `dark:` utilities match.
 * The inner div paints `bg-background` so each pane shows its own surface
 * rather than the greige desk behind the chrome.
 */
function Pane({ label, dark, children }: { label: string; dark?: boolean; children: ReactNode }) {
  return (
    <div className={dark ? 'dark' : undefined}>
      <div className="flex h-full flex-col bg-background">
        <p className="border-b border-border px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <div className="flex flex-1 flex-wrap items-center gap-3 p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Identification on the left, the same children rendered twice on the right.
 * `signature` is the prop combination being shown, in mono, so a reader can go
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
        <p className="font-mono text-xs text-foreground">{name}</p>
        {signature ? <p className="mt-1 font-mono text-[10px] break-words">{signature}</p> : null}
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
