import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-xl border border-border bg-neutral-50 p-5 ${className ?? ''}`}>
      {children}
    </View>
  );
}
