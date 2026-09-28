import { View } from 'react-native';

/** 4 pt track with an ink fill; value is clamped to 0..1. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      className="h-1 w-full overflow-hidden rounded-pill bg-secondary"
    >
      <View className="h-1 rounded-pill bg-ink" style={{ width: `${v * 100}%` }} />
    </View>
  );
}
