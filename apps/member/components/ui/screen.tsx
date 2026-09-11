import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Body
        className="flex-1 px-5 pt-2"
        contentContainerClassName={scroll ? 'pb-8 gap-5' : undefined}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}
