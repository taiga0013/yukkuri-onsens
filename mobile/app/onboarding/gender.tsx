import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const GENDERS: { label: string; value: 'male' | 'female' | 'unspecified' }[] = [
  { label: '男性', value: 'male' },
  { label: '女性', value: 'female' },
  { label: '設定しない', value: 'unspecified' },
];

export default function GenderOnboardingScreen() {
  const { colors, radius, type } = useTheme();
  const router = useRouter();
  const { session, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState<'male' | 'female' | 'unspecified' | null>(null);

  const choose = async (value: 'male' | 'female' | 'unspecified') => {
    if (!isSupabaseConfigured || !supabase || !session) return;
    setSubmitting(value);
    await supabase.from('profiles').update({ gender: value, gender_prompted: true }).eq('id', session.user.id);
    await refreshProfile();
    router.replace('/');
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.ink, fontSize: type.display }]}>性別を設定してください</Text>
      <Text style={{ color: colors.inkDim, fontSize: 14, marginTop: 8, marginBottom: 36, textAlign: 'center', lineHeight: 20 }}>
        男湯・女湯別の混雑状況を{'\n'}正しく表示するために使います
      </Text>

      <View style={{ width: '100%', gap: 12 }}>
        {GENDERS.map((g) => (
          <Pressable
            key={g.value}
            onPress={() => choose(g.value)}
            disabled={submitting !== null}
            style={[
              styles.button,
              { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.lg, opacity: submitting !== null ? 0.7 : 1 },
            ]}
          >
            {submitting === g.value ? (
              <ActivityIndicator color={colors.accentStrong} />
            ) : (
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15 }}>{g.label}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontWeight: '800', textAlign: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 1.5,
  },
});
