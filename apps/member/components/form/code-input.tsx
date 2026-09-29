import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { CODE_LENGTH } from '@/lib/email-change';

/**
 * One hidden TextInput drives six 56px boxes: paste, SMS autofill
 * (`oneTimeCode`) and the number pad all work on native and web.
 */
export function CodeInput({
  value,
  onChange,
  error = false,
  autoFocus = true,
  accessibilityLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  accessibilityLabel: string;
}) {
  const input = useRef<TextInput>(null);
  // -1 once all boxes are filled: there is no next box to show a focus stroke on.
  const focusIndex = value.length < CODE_LENGTH ? value.length : -1;
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none">
      <View className="flex-row justify-between gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const focused = i === focusIndex;
          const border = error ? 'border-danger' : focused ? 'border-ink border-2' : 'border-border';
          return (
            <View key={i} className={`h-14 flex-1 items-center justify-center rounded-[16px] border bg-background ${border}`}>
              <AppText variant="numeric" style={{ fontSize: 24 }}>
                {value[i] ?? ''}
              </AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        className="absolute inset-0 opacity-0"
        caretHidden
      />
    </Pressable>
  );
}
