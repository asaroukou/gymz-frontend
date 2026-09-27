import { Text, type TextProps } from 'react-native';

// « Le comptoir clair » type scale on Inter. Weight = family (tailwind.config).
// `numeric*`/`meta` variants carry every figure the member reads back (times,
// the countdown, entry counts, the member number) with tabular numerals.
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
  | 'meta';

// Colour lives here, never baked into `CLASS`: Tailwind/css-interop resolves
// same-property utility classes (e.g. two `text-*` classes) by the order they
// were inserted into the generated stylesheet, not by className order, so a
// caller's `text-muted` composed after the variant's own `text-ink` cannot be
// relied on to win. `tone` is the single place a colour utility comes from.
export type Tone = 'ink' | 'muted' | 'mutedStrong' | 'white' | 'success' | 'warning' | 'destructive' | 'info';

const CLASS: Record<Variant, string> = {
  display: 'font-sans-medium text-[32px] leading-[38px] tracking-[-0.6px]',
  title: 'font-sans-medium text-[28px] leading-[34px] tracking-[-0.4px]',
  heading: 'font-sans-semibold text-[17px] leading-[22px]',
  body: 'font-sans text-[15px] leading-[22px]',
  bodyStrong: 'font-sans-semibold text-[15px] leading-[22px]',
  label: 'font-sans text-[13px] leading-[18px]',
  caption: 'font-sans text-[12px] leading-[16px]',
  numeric: 'font-sans-medium text-[15px] leading-[20px]',
  numericLarge: 'font-sans-medium text-[40px] leading-[44px] tracking-[-1px]',
  meta: 'font-sans-medium text-[13px] leading-[18px]',
};

const TONE: Record<Tone, string> = {
  ink: 'text-ink',
  muted: 'text-muted',
  mutedStrong: 'text-muted-strong',
  white: 'text-white',
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
  info: 'text-info-foreground',
};

const DEFAULT_TONE: Record<Variant, Tone> = {
  display: 'ink',
  title: 'ink',
  heading: 'ink',
  body: 'ink',
  bodyStrong: 'ink',
  label: 'muted',
  caption: 'muted',
  numeric: 'ink',
  numericLarge: 'ink',
  meta: 'muted',
};

// `meta` is the booking time's variant (13/18, tabular numerals, muted).
const TABULAR = new Set<Variant>(['numeric', 'numericLarge', 'meta']);

export function AppText({
  variant = 'body',
  tone,
  className,
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  return (
    <Text
      className={`${CLASS[variant]} ${TONE[tone ?? DEFAULT_TONE[variant]]} ${className ?? ''}`}
      style={[TABULAR.has(variant) ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
}
