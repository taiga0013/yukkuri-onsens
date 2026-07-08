import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../constants/theme';

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors, type } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.ink, fontSize: type.h2 }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.inkFaint }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, gap: 2 },
  title: { fontWeight: '700' },
  subtitle: { fontSize: 12 },
});
