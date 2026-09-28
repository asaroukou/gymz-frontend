import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wash } from './wash';

// White page, 24 pt gutters. Screens own their vertical rhythm via child
// margins. `wash` adds the login's soft radial wash behind the content.
export function Screen({
  children,
  scroll = true,
  contentClassName,
  wash = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentClassName?: string;
  wash?: boolean;
}) {
  const padding = 'px-6 pt-4';
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {wash ? <Wash /> : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`${padding} pb-12 ${contentClassName ?? ''}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${padding} pb-6 ${contentClassName ?? ''}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
