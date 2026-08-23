import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { CartSummaryBar } from '../components/CartSummaryBar';
import { CategoryItem } from '../components/CategoryItem';
import { ProductCardSkeleton } from '../components/Skeleton';
import { ProductCard } from '../components/ProductCard';
import { PromoBanner } from '../components/PromoBanner';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useCatalog } from '../state/CatalogContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { useGridColumns } from '../theme/responsive';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TRUST_BADGES = ['🌿 100% Eggless', '🍞 Baked Daily', '✅ Pure Veg', '📍 Janakpuri'];

const BUNDLE = {
  name: "Tea-Time Combo",
  items: 'Khari Puff 250g • Atta Patti 250g • Rusk 200g • Brown Bread',
  price: 279,
  mrp: 355,
  savings: 76,
};

export function HomeScreen({ navigation }: Props) {
  const columns = useGridColumns();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [flashTime, setFlashTime] = useState({ m: 14, s: 23 });
  const flashPulse = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { products, categories, isLoading, error, reload } = useCatalog();

  useEffect(() => {
    /* Fade in header content on mount */
    Animated.timing(headerFade, { toValue: 1, duration: 380, delay: 80, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setFlashTime(prev => {
        let { m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 14; s = 59; }
        return { m, s };
      });
      /* Subtle scale pulse on each countdown tick */
      Animated.sequence([
        Animated.timing(flashPulse, { toValue: 1.07, duration: 75, useNativeDriver: true }),
        Animated.timing(flashPulse, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(p => p.name.toLowerCase().includes(query));
  }, [search, products]);

  const displayProducts = useMemo(() => {
    if (selectedCat && !search) {
      return filteredProducts.filter(p => p.categoryId === selectedCat);
    }
    return filteredProducts;
  }, [filteredProducts, selectedCat, search]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.greenTop}><AppHeader /></View>
        <View style={styles.skeletonGrid}>
          {Array.from({ length: columns * 2 }).map((_, i) => (
            <View key={i} style={{ width: `${100 / columns - 2}%` as any }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <Text style={styles.errorEmoji}>📡</Text>
        <Text style={[typography.subheading, { marginTop: spacing.sm }]}>Couldn't load products</Text>
        <Text style={[typography.body, styles.errorBody]}>
          Check your internet connection and try again.
        </Text>
        <Pressable style={styles.retryBtn} onPress={reload}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const flashLabel =
    `${String(flashTime.m).padStart(2, '0')}:${String(flashTime.s).padStart(2, '0')}`;

  const activeCatName = selectedCat
    ? categories.find(c => c.id === selectedCat)?.name ?? 'Products'
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed dark green header + search */}
      <View style={styles.greenTop}>
        <AppHeader />
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search cakes, breads, namkeen..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        key={columns}
        data={displayProducts}
        keyExtractor={item => item.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.productRow : undefined}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Animated.View style={{ opacity: headerFade }}>
            {/* Trust badges */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trustRow}
            >
              {TRUST_BADGES.map(badge => (
                <View key={badge} style={styles.trustBadge}>
                  <Text style={styles.trustBadgeText}>{badge}</Text>
                </View>
              ))}
            </ScrollView>

            {!search ? (
              <>
                {/* Flash Sale Card */}
                <Pressable style={styles.flashCard} onPress={() => navigation.navigate('Offers')}>
                  <View style={styles.flashCardContent}>
                    <Text style={styles.flashEyebrow}>Flash Sale Ending in</Text>
                    <Animated.Text style={[styles.flashCountdown, { transform: [{ scale: flashPulse }] }]}>
                      {flashLabel}
                    </Animated.Text>
                    <Text style={styles.flashSub}>Up to 40% off · Tap to see all deals →</Text>
                  </View>
                  <Text style={styles.flashBolt}>⚡</Text>
                </Pressable>

                {/* Promo Banner */}
                <View style={styles.bannerWrap}>
                  <PromoBanner />
                </View>

                {/* Today's Cheapest Basket */}
                <View style={styles.bundleCard}>
                  <View style={styles.bundleTop}>
                    <Text style={styles.bundleName}>🧺 {BUNDLE.name}</Text>
                    <View style={styles.bundleBadge}>
                      <Text style={styles.bundleBadgeText}>Save ₹{BUNDLE.savings}</Text>
                    </View>
                  </View>
                  <Text style={styles.bundleItems}>{BUNDLE.items}</Text>
                  <View style={styles.bundleFooter}>
                    <View>
                      <Text style={styles.bundlePrice}>₹{BUNDLE.price}</Text>
                      <Text style={styles.bundleMrp}>Market ₹{BUNDLE.mrp}</Text>
                    </View>
                    <Pressable style={styles.bundleAddAll}>
                      <Text style={styles.bundleAddAllText}>Add All</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Category circles */}
                <Text style={[typography.subheading, styles.catLabel]}>Categories</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryRow}
                >
                  {categories.map(category => (
                    <CategoryItem
                      key={category.id}
                      image={category.image}
                      name={category.name}
                      onPress={() =>
                        navigation.navigate('Category', {
                          categoryId: category.id,
                          categoryName: category.name,
                        })
                      }
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* Section header */}
            <View style={styles.sectionRow}>
              <Text style={[typography.subheading]}>
                {search
                  ? `Results for "${search}"`
                  : activeCatName
                  ? activeCatName
                  : 'All Products'}
              </Text>
              <Text style={styles.itemCount}>{displayProducts.length} items</Text>
            </View>

            {/* Category filter chips (only when not searching) */}
            {!search ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catChipRow}
              >
                <Pressable
                  style={[styles.catChip, !selectedCat && styles.catChipActive]}
                  onPress={() => setSelectedCat(null)}
                >
                  <Text style={[styles.catChipText, !selectedCat && styles.catChipTextActive]}>
                    All
                  </Text>
                </Pressable>
                {categories.map(cat => (
                  <Pressable
                    key={cat.id}
                    style={[styles.catChip, selectedCat === cat.id && styles.catChipActive]}
                    onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selectedCat === cat.id && styles.catChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </Animated.View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥦</Text>
            <Text style={[typography.subheading, { textAlign: 'center' }]}>No results found</Text>
            <Text style={[typography.body, styles.emptyText]}>Try a different search term.</Text>
          </View>
        }
        renderItem={({ item }) => (
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
        )}
      />
      <CartSummaryBar onPress={() => navigation.navigate('Cart')} />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    errorEmoji: { fontSize: 56 },
    errorBody: {
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs,
      lineHeight: 20,
    },
    retryBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    skeletonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.lg,
      gap: spacing.md,
    },
    skeletonCell: { width: '47.5%' },
    /* ── Green header ── */
    greenTop: {
      backgroundColor: colors.primaryDark,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.13)',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.md,
    },
    searchIcon: {
      fontSize: 15,
      marginRight: spacing.xs,
      color: 'rgba(255,255,255,0.7)',
    },
    searchInput: {
      flex: 1,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
      fontSize: 14,
      color: '#FFFFFF',
      backgroundColor: 'transparent',
    },
    searchClear: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.65)',
      paddingLeft: spacing.xs,
    },
    /* ── List content ── */
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120,
    },
    /* ── Trust badges ── */
    trustRow: {
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    trustBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trustBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    /* ── Flash card ── */
    flashCard: {
      backgroundColor: '#FBBF24',
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#F59E0B',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    flashCardContent: {
      flex: 1,
    },
    flashEyebrow: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(0,0,0,0.55)',
      marginBottom: 2,
    },
    flashCountdown: {
      fontSize: 32,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 1,
      lineHeight: 36,
    },
    flashSub: {
      fontSize: 11,
      color: 'rgba(0,0,0,0.5)',
      marginTop: 3,
    },
    flashBolt: {
      fontSize: 40,
      opacity: 0.18,
    },
    /* ── Promo banner ── */
    bannerWrap: {
      marginTop: spacing.md,
    },
    /* ── Bundle card ── */
    bundleCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginTop: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    bundleTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    bundleName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    bundleBadge: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    bundleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    bundleItems: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    bundleFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bundlePrice: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    bundleMrp: {
      fontSize: 11,
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    bundleAddAll: {
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    bundleAddAllText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    /* ── Category circles ── */
    catLabel: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    categoryRow: {
      gap: spacing.md,
    },
    /* ── Section header ── */
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    itemCount: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    /* ── Category filter chips ── */
    catChipRow: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    catChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 1,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    catChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    catChipTextActive: {
      color: '#FFFFFF',
    },
    /* ── Product grid ── */
    productRow: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    /* ── Empty state ── */
    emptyState: {
      marginTop: spacing.xxl * 2,
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
    },
  });
}
