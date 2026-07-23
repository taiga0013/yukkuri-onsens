import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { OnsenCard } from '../../components/OnsenCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SectionHeader } from '../../components/SectionHeader';
import { useTheme } from '../../constants/theme';
import { useHomeSections } from '../../hooks/useHomeSections';
import { useRecentVisits } from '../../hooks/useRecentVisits';
import { useOnsenData } from '../../context/OnsenDataContext';
import { sampleRandom } from '../../lib/random';

const FREE_ONSEN_LIMIT = 9;

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { onsens, getCongestion } = useOnsenData();
  const { popularIds } = useHomeSections();
  const { visits } = useRecentVisits();

  // ホーム画面を開くたびに全施設からランダムに5件選ぶ（管理者による手動選定は行わない）
  const recommendedIds = useMemo(() => sampleRandom(onsens, 5).map((o) => o.id), [onsens]);

  const findOnsen = (id: string) => onsens.find((o) => o.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="湯っくり" subtitle="今日はどこの温泉にしましょうか" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 28, paddingBottom: 40 }}>
        <View>
          <SectionHeader title="おすすめの温泉地" subtitle="編集部セレクト" />
          <View style={{ gap: spacing.md }}>
            {recommendedIds.map((id) => {
              const onsen = findOnsen(id);
              return onsen ? <OnsenCard key={id} onsen={onsen} congestion={getCongestion(id)} /> : null;
            })}
          </View>
        </View>

        <View>
          <SectionHeader title="人気ランキング" subtitle="直近7日間のチェックイン数" />
          <View style={{ gap: spacing.md }}>
            {popularIds.map((id, i) => {
              const onsen = findOnsen(id);
              return onsen ? <OnsenCard key={id} onsen={onsen} congestion={getCongestion(id)} rank={i + 1} /> : null;
            })}
          </View>
        </View>

        <View>
          <SectionHeader title="最近行った温泉地" />
          {visits.length === 0 ? (
            <EmptyNote />
          ) : (
            <View style={{ gap: spacing.md }}>
              {visits.map((v) => {
                const onsen = findOnsen(v.onsenId);
                return onsen ? <OnsenCard key={v.onsenId} onsen={onsen} congestion={getCongestion(v.onsenId)} /> : null;
              })}
            </View>
          )}
        </View>

        <View>
          <SectionHeader title="すべての温泉地" subtitle={`新潟県内 ${onsens.length}件`} />
          <View style={{ gap: spacing.md }}>
            {onsens.slice(0, FREE_ONSEN_LIMIT).map((onsen) => (
              <OnsenCard key={onsen.id} onsen={onsen} congestion={getCongestion(onsen.id)} />
            ))}
          </View>
          {onsens.length > FREE_ONSEN_LIMIT ? (
            <Pressable
              onPress={() => router.push('/subscription')}
              style={[styles.moreBtn, { borderColor: colors.accent, borderRadius: radius.lg }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.accentStrong} />
              <Text style={{ color: colors.accentStrong, fontWeight: '700', fontSize: 14 }}>もっとみる</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function EmptyNote() {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.rule }]}>
      <Text style={{ color: colors.inkFaint, fontSize: 13 }}>まだ訪問履歴がありません。近くの温泉地にチェックインしてみましょう。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 20, borderWidth: 1, borderRadius: 12, borderStyle: 'dashed' },
  moreBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
});
