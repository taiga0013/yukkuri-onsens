import { StyleSheet, View } from 'react-native';

import { useTheme } from '../constants/theme';

export function ProgressBar({ rate, color, height = 6 }: { rate: number; color: string; height?: number }) {
  const { colors, radius } = useTheme();
  const width = Math.max(0, Math.min(100, rate));

  return (
    <View style={[styles.track, { backgroundColor: colors.bgInset, height, borderRadius: radius.pill }]}>
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: color, borderRadius: radius.pill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
