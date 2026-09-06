'use client';

import { useEffect, useRef, useState } from 'react';

import { measureContrast, parseCssColor, toHex, type WcagLevel } from '@/lib/contrast';

/** A colour chip that reports the hex it actually painted. */
export function Swatch({ token, label }: { token: string; label?: string }) {
  const chipRef = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState<string | null>(null);

  useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    const parsed = parseCssColor(getComputedStyle(chip).backgroundColor);
    setHex(parsed ? toHex(parsed.rgb) : null);
  }, [token]);

  return (
    <div className="min-w-24 flex-1">
      <div
        ref={chipRef}
        className="h-14 w-full rounded-md border border-border"
        style={{ backgroundColor: `var(${token})` }}
      />
      <p className="mt-1.5 font-mono text-[10px] text-foreground">{label ?? token}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{hex ?? '—'}</p>
    </div>
  );
}

/**
 * A foreground colour on a background colour, with the measured ratio and its
 * WCAG band. Both take full CSS values (`var(--foreground)`, or a `color-mix()`
 * standing in for a Tailwind tint such as `bg-success/15`) rather than bare
 * token names, so tinted status pairs can be audited too. A failure is marked
 * with a wavy underline rather than a colour, because the chrome adds no colour
 * to what it measures.
 *
 * Known limit: a translucent foreground is composited over the background, but
 * a translucent *background* is not composited over the pane behind it. No
 * current token pair needs that.
 */
export function ContrastRow({
  foreground,
  background,
  label,
  sample = 'Abonnement mensuel',
}: {
  foreground: string;
  background: string;
  label?: string;
  sample?: string;
}) {
  const sampleRef = useRef<HTMLParagraphElement>(null);
  const [reading, setReading] = useState<{ ratio: number; level: WcagLevel } | null>(null);

  useEffect(() => {
    const element = sampleRef.current;
    if (!element) return;
    const styles = getComputedStyle(element);
    setReading(measureContrast(styles.color, styles.backgroundColor));
  }, [foreground, background]);

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <p
          ref={sampleRef}
          className="inline-block rounded-md px-2 py-1 text-sm"
          style={{ color: foreground, backgroundColor: background }}
        >
          {sample}
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {label ?? `${foreground} sur ${background}`}
        </p>
      </div>

      <p className="shrink-0 text-right font-mono text-[10px]">
        <span className="block text-foreground">
          {reading ? `${reading.ratio.toFixed(2)}:1` : '—'}
        </span>
        <span
          className={
            reading?.level === 'fail'
              ? 'block underline decoration-wavy underline-offset-2'
              : 'block text-muted-foreground'
          }
        >
          {reading?.level ?? ''}
        </span>
      </p>
    </div>
  );
}
