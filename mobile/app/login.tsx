import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { colors, radius, type } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.ink, fontSize: type.display }]}>湯めぐり新潟</Text>
      <Text style={{ color: colors.inkDim, fontSize: 14, marginTop: 8, marginBottom: 40, textAlign: 'center' }}>
        新潟県の温泉地をめぐり、{'\n'}混雑状況をリアルタイムに確認しよう
      </Text>

      <Pressable
        onPress={onPress}
        disabled={submitting}
        style={[styles.button, { backgroundColor: colors.accent, borderRadius: radius.lg, opacity: submitting ? 0.7 : 1 }]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.onAccent} />
            <Text style={{ color: colors.onAccent, fontWeight: '700', fontSize: 14.5 }}>Googleでログイン</Text>
          </>
        )}
      </Pressable>

      {error ? <Text style={{ color: colors.danger, fontSize: 12.5, marginTop: 16, textAlign: 'center' }}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontWeight: '800' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
});
