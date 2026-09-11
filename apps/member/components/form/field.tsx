import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { colors } from '@/lib/theme';

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  secure,
  keyboardType,
  errorText,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  errorText?: string;
}) {
  return (
    <View className="gap-1.5">
      <AppText variant="label">{label}</AppText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            accessibilityLabel={label}
            className="min-h-12 rounded-xl border border-border bg-neutral-50 px-4 text-base text-foreground"
            placeholderTextColor={colors.neutral[400]}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={secure}
            keyboardType={keyboardType ?? 'default'}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value ?? ''}
          />
        )}
      />
      {errorText ? <AppText className="text-destructive">{errorText}</AppText> : null}
    </View>
  );
}
