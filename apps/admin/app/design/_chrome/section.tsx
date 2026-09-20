import type { ReactNode } from 'react';

export function Section({
  id,
  number,
  title,
  note,
  children,
}: {
  id: string;
  number: string;
  title: string;
  note?: string;
  /** Optional: a note-only section (Élévation) carries no specimen. */
  children?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-6 pb-16">
      <header className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="font-numeric text-xs">{number}</span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {note ? <p className="w-full max-w-[70ch] text-xs leading-5">{note}</p> : null}
      </header>
      <div className="space-y-12">{children}</div>
    </section>
  );
}
