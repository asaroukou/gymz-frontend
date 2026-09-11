import { ActivityIndicator, Pressable, Text } from 'react-native';

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center rounded-pill px-5 ${
        isPrimary ? 'bg-primary' : 'bg-transparent'
      } ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fafaf9' : '#0c3d22'} />
      ) : (
        <Text
          className={`text-base font-medium ${isPrimary ? 'text-primary-foreground' : 'text-primary'}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
