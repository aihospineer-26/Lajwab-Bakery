import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartSummaryBar } from '../components/CartSummaryBar';
import { ProductCard } from '../components/ProductCard';
import { RootStackParamList } from '../navigation/types';
import { useCatalog } from '../state/CatalogContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { useGridColumns } from '../theme/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

type SortOption = 'default' | 'priceLow' | 'priceHigh';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default', label: 'Relevance' },
  { id: 'priceLow', label: 'Price: Low → High' },
  { id: 'priceHigh', label: 'Price: High → Low' },
];

/* Staggered per-row fade-slide entrance for each product card */
function FadeSlideIn({ rowIndex, children }: { rowIndex: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    const delay = Math.min(rowIndex, 8) * 55;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export function CategoryScreen({ route, navigation }: Props) {
  const { categoryId, categoryName } = route.params;
  const columns = useGridColumns();
  const [sort, setSort] = useState<SortOption>('default');
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { products, categories } = useCatalog();

  /* Header and sort chip entrance */
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-10)).current;
  const sortOpacity = useRef(new Animated.Value(0)).current;
  const sortX = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 230, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 230, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(130),
        Animated.parallel([
          Animated.timing(sortOpacity, { toValue: 1, duration: 210, useNativeDriver: true }),
          Animated.timing(sortX, { toValue: 0, duration: 210, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const category = categories.find(c => c.id === categoryId);

  const filtered = useMemo(() => {
    const items = products.filter((p) => p.categoryId === categoryId);
    if (sort === 'priceLow') return [...items].sort((a, b) => a.price - b.price);
    if (sort === 'priceHigh') return [...items].sort((a, b) => b.price - a.price);
    return items;
  }, [categoryId, sort, products]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Animated green header */}
      <Animated.View
        style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
      >
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          {category?.image ? (
            <Text style={styles.headerEmoji}>{getCategoryEmoji(categoryName)}</Text>
          ) : null}
          <Text style={styles.headerTitle}>{categoryName}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{filtered.length} items</Text>
        </View>
      </Animated.View>

      {/* Animated sort chips */}
      <Animated.View
        style={[styles.sortWrap, { opacity: sortOpacity, transform: [{ translateX: sortX }] }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}
        >
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.sortChip, sort === option.id && styles.sortChipActive]}
              onPress={() => setSort(option.id)}
            >
              <Text style={[styles.sortChipText, sort === option.id && styles.sortChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      <FlatList
        key={columns}
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={[typography.subheading, { textAlign: 'center' }]}>
              Nothing here yet
            </Text>
            <Text style={[typography.caption, { textAlign: 'center', marginTop: 4 }]}>
              Products coming soon!
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeSlideIn rowIndex={Math.floor(index / columns)}>
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
          </FadeSlideIn>
        )}
      />

      <CartSummaryBar onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })} />
    </SafeAreaView>
  );
}

/* Maps a category name to a relevant emoji for the header */
function getCategoryEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('fruit')) return '🍎';
  if (n.includes('dairy') || n.includes('milk')) return '🥛';
  if (n.includes('grain') || n.includes('rice') || n.includes('bread')) return '🌾';
  if (n.includes('snack')) return '🍿';
  if (n.includes('beverage') || n.includes('drink') || n.includes('juice')) return '🧃';
  if (n.includes('spice') || n.includes('masala')) return '🌶️';
  if (n.includes('oil') || n.includes('ghee')) return '🫙';
  if (n.includes('meat') || n.includes('chicken') || n.includes('fish')) return '🍗';
  if (n.includes('egg')) return '🥚';
  if (n.includes('sweet') || n.includes('dessert')) return '🍮';
  return '🛒';
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    /* ── Green header ── */
    header: {
      backgroundColor: colors.primaryDark,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    backIcon: {
      fontSize: 18,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    headerCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      justifyContent: 'center',
    },
    headerEmoji: {
      fontSize: 18,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerRight: {
      width: 52,
      alignItems: 'flex-end',
    },
    headerCount: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.65)',
    },
    /* ── Sort chips ── */
    sortWrap: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    sortRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    sortChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingVertical: spacing.xs + 1,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
    },
    sortChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    sortChipTextActive: {
      color: '#FFFFFF',
    },
    /* ── Grid ── */
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl * 2,
    },
    row: {
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    /* ── Empty ── */
    emptyState: {
      marginTop: spacing.xxl * 2,
      alignItems: 'center',
      gap: spacing.xs,
    },
    emptyEmoji: {
      fontSize: 44,
      marginBottom: spacing.sm,
    },
  });
}
