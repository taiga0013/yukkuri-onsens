import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../constants/theme';

export function SettingsRow({
  label,
  value,
  right,
  onPress,
}: {
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.row, { borderColor: colors.rule }]}>
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      <View style={styles.right}>
        {value ? <Text style={{ color: colors.inkFaint, fontSize: 13 }}>{value}</Text> : null}
        {right}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  label: { fontSize: 14.5, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
