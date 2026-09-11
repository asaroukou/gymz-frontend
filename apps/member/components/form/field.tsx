import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/text';
import { colors } from '@/lib/theme';

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  secure,
  keyboardType,
  errorText,
  icon: Icon,
  autoComplete,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  errorText?: string;
  icon?: LucideIcon;
  autoComplete?: 'email' | 'password' | 'off';
}) {
  const [focused, setFocused] = useState(false);
  // Focus and error both recolor the pill border, matching the owner app's
  // ring-on-focus / erreur-on-invalid convention.
  const borderClass = errorText
    ? 'border-destructive'
    : focused
      ? 'border-primary'
      : 'border-border';
  return (
    <View className="gap-1.5">
      <AppText variant="label">{label}</AppText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            className={`h-12 flex-row items-center gap-2.5 rounded-pill border bg-neutral-50 px-4 ${borderClass}`}
          >
            {Icon ? (
              <Icon color={focused ? colors.primary.DEFAULT : colors.neutral[400]} size={18} />
            ) : null}
            <TextInput
              accessibilityLabel={label}
              className="h-12 flex-1 font-sans text-[15px] text-foreground"
              placeholderTextColor={colors.neutral[400]}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={autoComplete}
              secureTextEntry={secure}
              keyboardType={keyboardType ?? 'default'}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onFocus={() => setFocused(true)}
              onChangeText={onChange}
              value={value ?? ''}
            />
          </View>
        )}
      />
      {errorText ? (
        <AppText variant="label" className="text-destructive-foreground">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}
