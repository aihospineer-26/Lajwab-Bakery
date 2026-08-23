import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ProductCard } from '../components/ProductCard';
import { RootStackParamList } from '../navigation/types';
import { useCatalog } from '../state/CatalogContext';
import { useTheme } from '../state/ThemeContext';
import { useWishlist } from '../state/WishlistContext';
import { ColorPalette, radius, spacing } from '../theme';
import { useGridColumns } from '../theme/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlist'>;

export function WishlistScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { wishlist } = useWishlist();
  const { products } = useCatalog();
  const columns = useGridColumns();

  const wishlisted = useMemo(
    () => products.filter(p => wishlist.includes(p.id)),
    [products, wishlist],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Saved Items" onBack={() => navigation.goBack()} />

      {wishlisted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyBody}>Tap the heart on any product to save it here.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}>
            <Text style={styles.emptyBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={wishlisted}
          keyExtractor={p => p.id}
          numColumns={columns}
          key={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <ProductCard
                productId={item.id}
                image={item.image}
                name={item.name}
                unit={item.unit}
                price={item.price}
                mrp={item.mrp}
                stock={item.stock}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    row: { gap: spacing.md },
    cardWrap: { flex: 1 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
    emptyEmoji: { fontSize: 64, marginBottom: spacing.sm },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    emptyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  });
}
