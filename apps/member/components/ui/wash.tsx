import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/lib/theme';

/** The one soft wash behind the login heading (canvas J237z). Decorative. */
export function Wash() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Svg width="100%" height={420}>
        <Defs>
          <RadialGradient id="wash" cx="50%" cy="0%" rx="75%" ry="100%">
            <Stop offset="0" stopColor={colors.wash} stopOpacity="0.9" />
            <Stop offset="1" stopColor={colors.background} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="420" fill="url(#wash)" />
      </Svg>
    </View>
  );
}
