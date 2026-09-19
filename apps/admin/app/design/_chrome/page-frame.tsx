import type { ReactNode } from 'react';

export interface TocEntry {
  id: string;
  label: string;
}

/** Section numbers come from TOC position, so reordering can never desync them. */
export function sectionNumber(entries: readonly TocEntry[], id: string): string {
  const index = entries.findIndex((entry) => entry.id === id);
  return String(index + 1).padStart(2, '0');
}

export function PageFrame({
  title,
  intro,
  entries,
  children,
}: {
  title: string;
  intro?: string;
  entries: readonly TocEntry[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <header className="mb-10 max-w-[70ch]">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">{title}</h1>
        {intro ? <p className="mt-2 text-sm">{intro}</p> : null}
      </header>

      <div className="grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
        <nav aria-label="Sommaire" className="lg:sticky lg:top-20 lg:self-start">
          <ol className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-2">
                <span className="font-numeric text-[10px] leading-5">
                  {sectionNumber(entries, entry.id)}
                </span>
                <a
                  href={`#${entry.id}`}
                  className="rounded-sm text-xs leading-5 underline-offset-2 hover:text-foreground hover:underline"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
