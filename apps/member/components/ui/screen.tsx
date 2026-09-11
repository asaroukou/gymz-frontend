import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screens own their own vertical rhythm (no forced uniform gap): pass spacing
// via child margins so the hero breathes and grouped rows stay tight.
export function Screen({
  children,
  scroll = true,
  contentClassName,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentClassName?: string;
}) {
  const padding = 'px-5 pt-3';
  if (!scroll) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className={`flex-1 ${padding} ${contentClassName ?? ''}`}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName={`${padding} pb-12 ${contentClassName ?? ''}`}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
