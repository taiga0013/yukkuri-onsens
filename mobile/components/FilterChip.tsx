import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../constants/theme';

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accent : colors.bgRaised,
          borderColor: active ? colors.accent : colors.rule,
          borderRadius: radius.pill,
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.onAccent : colors.inkDim }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  label: { fontSize: 13, fontWeight: '600' },
});
