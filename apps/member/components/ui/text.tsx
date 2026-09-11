import { Text, type TextProps } from 'react-native';

// The brand type scale (DESIGN.md), expressed with the loaded Hanken Grotesk /
// Geist Mono families. Weight is chosen by family name (see tailwind.config).
// `mono`/`monoLarge` carry every numeral the member reads back: dates, counts,
// the countdown, the card number.
type Variant =
  'display' | 'title' | 'section' | 'body' | 'bodyStrong' | 'label' | 'mono' | 'monoLarge';

const CLASS: Record<Variant, string> = {
  display: 'font-sans-semibold text-[28px] leading-[32px] tracking-[-0.6px] text-foreground',
  title: 'font-sans-semibold text-[21px] leading-[26px] tracking-[-0.3px] text-foreground',
  section: 'font-sans-semibold text-[16px] leading-[22px] text-foreground',
  body: 'font-sans text-[15px] leading-[22px] text-foreground',
  bodyStrong: 'font-sans-medium text-[15px] leading-[22px] text-foreground',
  label: 'font-sans-medium text-[13px] leading-[18px] text-neutral-500',
  mono: 'font-mono text-[15px] leading-[20px] text-foreground',
  monoLarge: 'font-mono-medium text-[34px] leading-[38px] tracking-[-1px] text-foreground',
};

export function AppText({
  variant = 'body',
  className,
  ...rest
}: TextProps & { variant?: Variant }) {
  // Caller className comes last so a color/spacing override wins.
  return <Text className={`${CLASS[variant]} ${className ?? ''}`} {...rest} />;
}
