import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../constants/theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12, borderColor: colors.rule }]}>
      <Text style={[styles.title, { color: colors.ink, fontSize: type.display }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.inkDim }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontWeight: '800' },
  subtitle: { fontSize: 12.5, marginTop: 4 },
});
