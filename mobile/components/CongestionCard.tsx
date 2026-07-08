import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CongestionBadge } from './CongestionBadge';
import { ProgressBar } from './ProgressBar';
import { useTheme } from '../constants/theme';
import type { Congestion, Onsen } from '../types/onsen';
import { getCongestionLevel } from '../types/onsen';

export function CongestionCard({ onsen, congestion }: { onsen: Onsen; congestion: Congestion }) {
  const { colors, congestion: semantic, spacing, radius, type } = useTheme();
  const router = useRouter();
  const levelColor = {
    empty: semantic.empty,
    normal: semantic.normal,
    busy: semantic.busy,
  }[getCongestionLevel(congestion.congestionRate)];

  return (
    <Pressable
      onPress={() => router.push(`/onsen/${onsen.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.bgRaised, borderColor: colors.rule, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.header}>
        <Image source={{ uri: onsen.photos[0] }} style={styles.thumb} contentFit="cover" />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.name, { color: colors.ink, fontSize: type.body }]} numberOfLines={1}>
            {onsen.name}
          </Text>
          <Text style={{ color: colors.inkFaint, fontSize: 11.5 }} numberOfLines={1}>
            {onsen.areaName}
          </Text>
        </View>
        <CongestionBadge rate={congestion.congestionRate} />
      </View>

      <View style={{ gap: 6 }}>
        <View style={styles.metaRow}>
          <Text style={{ color: colors.inkDim, fontSize: 12.5 }}>
            利用人数 <Text style={{ color: colors.ink, fontWeight: '700' }}>{congestion.usersCount}人</Text> ・ 組数{' '}
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{congestion.groupsCount}組</Text>
          </Text>
        </View>
        <ProgressBar rate={congestion.congestionRate} color={levelColor} height={7} />
      </View>

      <View style={[styles.genderRow, { borderColor: colors.rule }]}>
        <GenderStat label="男湯" count={congestion.male.usersCount} rate={congestion.male.congestionRate} color={semantic.normal} />
        <View style={[styles.vDivider, { backgroundColor: colors.rule }]} />
        <GenderStat label="女湯" count={congestion.female.usersCount} rate={congestion.female.congestionRate} color={semantic.busy} />
      </View>

      <Text style={{ color: colors.inkFaint, fontSize: 11 }}>
        最終更新：{new Date(congestion.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Pressable>
  );
}

function GenderStat({ label, count, rate, color }: { label: string; count: number; rate: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.inkDim, fontSize: 11.5, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: '700' }}>
        {count}人 <Text style={{ color: colors.inkFaint, fontWeight: '400' }}>({rate}%)</Text>
      </Text>
      <ProgressBar rate={rate} color={color} height={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  name: { fontWeight: '700' },
  metaRow: { flexDirection: 'row' },
  genderRow: { flexDirection: 'row', paddingTop: 10, borderTopWidth: 1 },
  vDivider: { width: 1, marginHorizontal: 14 },
});
