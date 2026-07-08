import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { OnsenCard } from '../../components/OnsenCard';
import { FilterChip } from '../../components/FilterChip';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../constants/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { useOnsenData } from '../../context/OnsenDataContext';
import type { Region } from '../../types/onsen';
import { getCongestionLevel } from '../../types/onsen';

const REGIONS: Region[] = ['上越', '中越', '下越'];

export default function SearchScreen() {
  const { colors, spacing, radius } = useTheme();
  const { onsens, getCongestion } = useOnsenData();
  const { isFavorite } = useFavorites();
  const [query, setQuery] = useState('');
  const [emptyOnly, setEmptyOnly] = useState(false);
  const [rotenburoOnly, setRotenburoOnly] = useState(false);
  const [saunaOnly, setSaunaOnly] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);

  const results = useMemo(() => {
    const q = query.trim();
    return onsens.filter((o) => {
      if (q && !`${o.name}${o.areaName}${o.city}`.includes(q)) return false;
      if (emptyOnly && getCongestionLevel(getCongestion(o.id).congestionRate) !== 'empty') return false;
      if (rotenburoOnly && !o.features.rotenburo) return false;
      if (saunaOnly && !o.features.sauna) return false;
      if (favoriteOnly && !isFavorite(o.id)) return false;
      if (region && o.region !== region) return false;
      return true;
    });
  }, [onsens, query, emptyOnly, rotenburoOnly, saunaOnly, favoriteOnly, region, isFavorite, getCongestion]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="探す" subtitle="温泉地名・地域名で検索できます" />

      <View style={{ paddingHorizontal: 20, gap: spacing.md }}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgRaised, borderColor: colors.rule, borderRadius: radius.lg }]}>
          <Ionicons name="search-outline" size={18} color={colors.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="温泉地名・地域名で検索"
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, { color: colors.ink }]}
          />
        </View>

        <View style={styles.chipRow}>
          <FilterChip label="空いているところ" active={emptyOnly} onPress={() => setEmptyOnly((v) => !v)} />
          <FilterChip label="露天風呂あり" active={rotenburoOnly} onPress={() => setRotenburoOnly((v) => !v)} />
          <FilterChip label="サウナあり" active={saunaOnly} onPress={() => setSaunaOnly((v) => !v)} />
          <FilterChip label="お気に入り" active={favoriteOnly} onPress={() => setFavoriteOnly((v) => !v)} />
        </View>

        <View style={styles.chipRow}>
          {REGIONS.map((r) => (
            <FilterChip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? null : r)} />
          ))}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: spacing.md, paddingBottom: 40 }}
        renderItem={({ item }) => <OnsenCard onsen={item} congestion={getCongestion(item.id)} />}
        ListEmptyComponent={
          <Text style={{ color: colors.inkFaint, textAlign: 'center', marginTop: 40 }}>
            条件に合う温泉地が見つかりませんでした
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
