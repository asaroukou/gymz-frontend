import { cn } from '@iziwellpass/ui/lib/utils';
import { Progress } from '@iziwellpass/ui/components/progress';

export type CapacityLevel = 'ok' | 'tight' | 'over';

/**
 * Capacity level from booked/capacity. `tight` covers "almost full" through
 * "full" (>=85%); `over` is a genuine overbook (booked > capacity). Reserving
 * red for `over` keeps a merely-full class calm, per the brand's "no alarms":
 * a full class is expected, not an error.
 */
export function capacityLevel(booked: number, capacity: number): CapacityLevel {
  if (capacity > 0 && booked > capacity) return 'over';
  const pct = capacity > 0 ? (booked / capacity) * 100 : 0;
  if (pct >= 85) return 'tight';
  return 'ok';
}

const INDICATOR: Record<CapacityLevel, string> = {
  ok: '', // primary ink
  tight: 'bg-warning',
  over: 'bg-destructive',
};

export interface CapacityProps {
  booked: number;
  capacity: number;
  /** Accessible description, e.g. "12 réservés sur 18". */
  label?: string;
  /** Hide the mono count line and render the bar alone. */
  hideCount?: boolean;
  className?: string;
}

/**
 * The signature "barre de capacité": a mono booked/capacity count over a bar
 * whose fill color encodes the level (ink when there is room, amber when tight
 * or full, red only when overbooked). Bakes in the Mono Numbers and
 * Meaning-Only Color rules so the numeral and the color can't drift per call
 * site, and so the paired status badge (via `capacityLevel`) always agrees.
 */
export function Capacity({ booked, capacity, label, hideCount, className }: CapacityProps) {
  const pct = capacity > 0 ? Math.min(100, (booked / capacity) * 100) : 0;
  const level = capacityLevel(booked, capacity);
  return (
    <div className={cn('grid gap-1', className)}>
      {hideCount ? null : (
        <p className="text-right font-mono text-xs tabular-nums text-muted-foreground">
          {booked}/{capacity}
        </p>
      )}
      <Progress value={pct} indicatorClassName={INDICATOR[level]} aria-label={label} />
    </div>
  );
}
