import { Text, type TextProps } from 'react-native';

type Variant = 'title' | 'section' | 'body' | 'label' | 'mono';
const CLASS: Record<Variant, string> = {
  title: 'text-2xl font-semibold text-foreground',
  section: 'text-lg font-semibold text-foreground',
  body: 'text-base text-foreground',
  label: 'text-sm text-neutral-500',
  mono: 'text-base font-mono text-foreground',
};

export function AppText({
  variant = 'body',
  className,
  ...rest
}: TextProps & { variant?: Variant }) {
  return <Text className={`${CLASS[variant]} ${className ?? ''}`} {...rest} />;
}
