import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, TextInput, View } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/text';
import { t } from '@/lib/i18n';
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
  autoComplete?: 'email' | 'password' | 'new-password' | 'off';
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const border = errorText ? 'border-danger' : focused ? 'border-ink' : 'border-border';
  return (
    <View className="gap-1.5">
      <AppText variant="label" tone="ink" className="font-sans-medium">
        {label}
      </AppText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            className={`h-[52px] flex-row items-center gap-2.5 rounded-pill border bg-background px-5 ${border}`}
          >
            {Icon ? <Icon color={focused ? colors.ink : colors.muted} size={18} strokeWidth={1.5} /> : null}
            <TextInput
              accessibilityLabel={label}
              className="h-[52px] flex-1 font-sans text-[15px] text-ink"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={autoComplete}
              secureTextEntry={secure && !revealed}
              keyboardType={keyboardType ?? 'default'}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onFocus={() => setFocused(true)}
              onChangeText={onChange}
              value={value ?? ''}
            />
            {secure ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={revealed ? t('login.hidePassword') : t('login.showPassword')}
                onPress={() => setRevealed((r) => !r)}
                className="-mr-2 h-11 w-11 items-center justify-center"
              >
                {revealed ? (
                  <EyeOff color={colors.muted} size={20} strokeWidth={1.5} />
                ) : (
                  <Eye color={colors.muted} size={20} strokeWidth={1.5} />
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      />
      {errorText ? (
        <AppText variant="label" tone="destructive">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}
