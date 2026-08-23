import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  rating: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  /** Presence makes the stars tappable; omit for a read-only display */
  onChange?: (rating: number) => void;
};

export function StarRating({ rating, size = 16, color = '#F5A623', emptyColor = '#D1D5DB', onChange }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable key={n} onPress={() => onChange?.(n)} disabled={!onChange} hitSlop={6}>
          <Text style={{ fontSize: size, color: n <= Math.round(rating) ? color : emptyColor }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
