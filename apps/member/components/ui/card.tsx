import type { ReactNode } from 'react';
import { View } from 'react-native';

type Tint = 'bleu' | 'vert' | 'sable' | 'rose' | 'lavande';

const TINT: Record<Tint, string> = {
  bleu: 'bg-tint-bleu',
  vert: 'bg-tint-vert',
  sable: 'bg-tint-sable',
  rose: 'bg-tint-rose',
  lavande: 'bg-tint-lavande',
};

/** A 24-radius panel: tinted (the pass) or white with a hairline. */
export function Card({
  children,
  className,
  tint,
}: {
  children: ReactNode;
  className?: string;
  tint?: Tint;
}) {
  const surface = tint ? TINT[tint] : 'border border-border bg-background';
  return <View className={`rounded-panel p-5 ${surface} ${className ?? ''}`}>{children}</View>;
}
