import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CongestionBadge } from './CongestionBadge';
import { useTheme } from '../constants/theme';
import type { Congestion, Onsen } from '../types/onsen';
import { distanceKm, formatDistance, MOCK_CURRENT_LOCATION } from '../utils/geo';

export function OnsenCard({
  onsen,
  congestion,
  rank,
}: {
  onsen: Onsen;
  congestion: Congestion;
  rank?: number;
}) {
  const { colors, spacing, radius, type } = useTheme();
  const router = useRouter();
  const km = distanceKm(MOCK_CURRENT_LOCATION, onsen);

  return (
    <Pressable
      onPress={() => router.push(`/onsen/${onsen.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.bgRaised, borderColor: colors.rule, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.thumbWrap}>
        <Image source={{ uri: onsen.photos[0] }} style={styles.thumb} contentFit="cover" transition={150} />
        {rank ? (
          <View style={[styles.rankBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.rankText, { color: colors.onAccent }]}>{rank}</Text>
          </View>
        ) : null}
        {onsen.isTemporarilyClosed ? (
          <View style={[styles.closedBanner, { backgroundColor: colors.danger }]}>
            <Text style={styles.closedText}>休業中</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: spacing.xs, paddingVertical: 2 }}>
        <Text style={[styles.name, { color: colors.ink, fontSize: type.body }]} numberOfLines={1}>
          {onsen.name}
        </Text>
        <Text style={[styles.location, { color: colors.inkFaint }]} numberOfLines={1}>
          {onsen.prefecture}
          {onsen.city}
          {onsen.area}
        </Text>
        <Text style={[styles.distance, { color: colors.inkDim }]}>{formatDistance(km)}</Text>
        <CongestionBadge rate={congestion.congestionRate} size="sm" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  thumbWrap: { width: 92, height: 92, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '800' },
  closedBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: 'center',
  },
  closedText: { color: '#fff', fontSize: 10.5, fontWeight: '700' },
  name: { fontWeight: '700' },
  location: { fontSize: 11.5 },
  distance: { fontSize: 12 },
});
