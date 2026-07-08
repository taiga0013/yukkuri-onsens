import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { CongestionCard } from '../../components/CongestionCard';
import { FilterChip } from '../../components/FilterChip';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../constants/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { useOnsenData } from '../../context/OnsenDataContext';
import { distanceKm, MOCK_CURRENT_LOCATION } from '../../utils/geo';

type SortMode = 'distance' | 'empty';

export default function CongestionScreen() {
  const { colors, spacing } = useTheme();
  const { onsens, getCongestion } = useOnsenData();
  const { isFavorite } = useFavorites();
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const rows = useMemo(() => {
    let list = onsens.map((o) => ({ onsen: o, congestion: getCongestion(o.id) }));
    if (favoriteOnly) list = list.filter((r) => isFavorite(r.onsen.id));

    if (sortMode === 'distance') {
      list = [...list].sort(
        (a, b) => distanceKm(MOCK_CURRENT_LOCATION, a.onsen) - distanceKm(MOCK_CURRENT_LOCATION, b.onsen),
      );
    } else {
      list = [...list].sort((a, b) => a.congestion.congestionRate - b.congestion.congestionRate);
    }
    return list;
  }, [onsens, getCongestion, sortMode, favoriteOnly, isFavorite]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="混雑状況" subtitle="5分ごとに自動更新されます" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 4 }}>
        <FilterChip label="距離順" active={sortMode === 'distance'} onPress={() => setSortMode('distance')} />
        <FilterChip label="空き順" active={sortMode === 'empty'} onPress={() => setSortMode('empty')} />
        <FilterChip label="お気に入り" active={favoriteOnly} onPress={() => setFavoriteOnly((v) => !v)} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.onsen.id}
        contentContainerStyle={{ padding: 20, gap: spacing.md, paddingBottom: 40 }}
        renderItem={({ item }) => <CongestionCard onsen={item.onsen} congestion={item.congestion} />}
      />
    </View>
  );
}
