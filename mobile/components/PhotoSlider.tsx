import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';

import { useTheme } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function PhotoSlider({ photos, height = 260 }: { photos: string[]; height?: number }) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);

  return (
    <View style={{ height }}>
      <FlatList
        data={photos}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width: SCREEN_WIDTH, height }} contentFit="cover" transition={150} />
        )}
      />
      {photos.length > 1 ? (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.accent : 'rgba(255,255,255,0.45)' },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
