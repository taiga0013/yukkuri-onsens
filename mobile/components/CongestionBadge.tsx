import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../constants/theme';
import { congestionLabel, getCongestionLevel } from '../types/onsen';

export function CongestionBadge({ rate, size = 'md' }: { rate: number; size?: 'sm' | 'md' }) {
  const { congestion } = useTheme();
  const level = getCongestionLevel(rate);
  const color = { empty: congestion.empty, normal: congestion.normal, busy: congestion.busy }[level];
  const fontSize = size === 'sm' ? 12 : 13.5;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color, fontSize }]}>
        {congestionLabel[level]} · {rate}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontWeight: '700' },
});
