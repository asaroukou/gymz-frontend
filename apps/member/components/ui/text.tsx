import { Text, type TextProps } from 'react-native';

// « Le comptoir clair » type scale on Inter. Weight = family (tailwind.config).
// `numeric*` variants carry every figure the member reads back (times, the
// countdown, entry counts, the member number) with tabular numerals.
type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'numeric'
  | 'numericLarge'
  // Legacy aliases (plan R3) — removed in Task 9.
  | 'section'
  | 'mono'
  | 'monoLarge';

const CLASS: Record<Variant, string> = {
  display: 'font-sans-medium text-[32px] leading-[38px] tracking-[-0.6px] text-ink',
  title: 'font-sans-medium text-[28px] leading-[34px] tracking-[-0.4px] text-ink',
  heading: 'font-sans-semibold text-[17px] leading-[22px] text-ink',
  body: 'font-sans text-[15px] leading-[22px] text-ink',
  bodyStrong: 'font-sans-semibold text-[15px] leading-[22px] text-ink',
  label: 'font-sans text-[13px] leading-[18px] text-muted',
  caption: 'font-sans text-[12px] leading-[16px] text-muted',
  numeric: 'font-sans-medium text-[15px] leading-[20px] text-ink',
  numericLarge: 'font-sans-medium text-[40px] leading-[44px] tracking-[-1px] text-ink',
  section: 'font-sans-semibold text-[17px] leading-[22px] text-ink',
  mono: 'font-sans-medium text-[15px] leading-[20px] text-ink',
  monoLarge: 'font-sans-medium text-[40px] leading-[44px] tracking-[-1px] text-ink',
};

const TABULAR = new Set<Variant>(['numeric', 'numericLarge', 'mono', 'monoLarge']);

export function AppText({
  variant = 'body',
  className,
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  // Caller className comes last so a color/spacing override wins.
  return (
    <Text
      className={`${CLASS[variant]} ${className ?? ''}`}
      style={[TABULAR.has(variant) ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
}
