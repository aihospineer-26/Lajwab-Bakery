import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { resolveImage } from '../data/productImages';
import { Ionicons } from '@expo/vector-icons';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProductCard } from '../components/ProductCard';
import { usePersistedState } from '../hooks/usePersistedState';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useCatalog } from '../state/CatalogContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { useGridColumns } from '../theme/responsive';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Search'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TRENDING = [
  { label: '56 Bhog Thaali', emoji: '🪔' },
  { label: 'Butterscotch', emoji: '🍰' },
  { label: 'Black Forest', emoji: '🎂' },
  { label: 'Brown Bread', emoji: '🍞' },
  { label: 'Aloo Patty', emoji: '🥟' },
  { label: 'Khari', emoji: '🥐' },
  { label: 'Bhujia', emoji: '🥨' },
  { label: 'Cookies', emoji: '🍪' },
];

/* Staggered fade+slide entrance */
function FadeIn({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const delay = Math.min(index, 10) * 45;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 240, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function SearchScreen({ navigation }: Props) {
  const columns = useGridColumns();
  const { width } = useWindowDimensions();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { products, categories } = useCatalog();

  const [query, setQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const browseKey = useRef(0);
  const [recent, setRecent] = usePersistedState<string[]>('recent_searches', []);

  const rememberSearch = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecent(prev => [trimmed, ...prev.filter(r => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8));
  };

  const cardWidth = (width - spacing.lg * 2 - (columns - 1) * spacing.md) / columns;
  const catCardWidth = (width - spacing.lg * 2 - spacing.sm) / 2;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q);
      const matchesCat = !selectedCatId || p.categoryId === selectedCatId;
      return matchesQuery && matchesCat;
    });
  }, [query, selectedCatId, products]);

  const showResults = query.length > 0 || selectedCatId !== null;
  const activeCatName = categories.find(c => c.id === selectedCatId)?.name;

  const clearAll = () => {
    setQuery('');
    setSelectedCatId(null);
    browseKey.current += 1;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Green header ── */}
      <View style={styles.header}>
        <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search cakes, breads, namkeen..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={() => rememberSearch(query)}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={12}>
              <View style={styles.clearBtn}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Category chips ── */}
      <View style={styles.chipsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.chips}
          ListHeaderComponent={
            <Pressable
              style={[styles.chip, !selectedCatId && styles.chipActive]}
              onPress={() => setSelectedCatId(null)}
            >
              <Text style={[styles.chipText, !selectedCatId && styles.chipTextActive]}>All</Text>
            </Pressable>
          }
          renderItem={({ item }) => {
            const active = selectedCatId === item.id;
            return (
              <Pressable
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCatId(active ? null : item.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* ── Active filter pill ── */}
      {showResults && (
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {query ? <Text style={styles.filterBold}> for "{query}"</Text> : null}
            {activeCatName ? <Text style={styles.filterBold}> in {activeCatName}</Text> : null}
          </Text>
          <Pressable style={styles.clearFilter} onPress={clearAll} hitSlop={8}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* ── Browse (no query/filter) ── */}
      {!showResults ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.browseContent}>
          {/* Recent searches */}
          {recent.length > 0 && (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionLabel}>Recent searches</Text>
                <Pressable onPress={() => setRecent([])} hitSlop={8}>
                  <Text style={styles.recentClear}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.recentWrap}>
                {recent.map((term, i) => (
                  <FadeIn key={term} index={i}>
                    <Pressable style={styles.recentChip} onPress={() => setQuery(term)}>
                      <Ionicons name="time-outline" size={15} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
                      <Text style={styles.recentText}>{term}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => setRecent(prev => prev.filter(r => r !== term))}
                      >
                        <Text style={styles.recentRemove}>✕</Text>
                      </Pressable>
                    </Pressable>
                  </FadeIn>
                ))}
              </View>
            </>
          )}

          {/* Trending */}
          <Text style={[styles.sectionLabel, recent.length > 0 && { marginTop: spacing.xl }]}>
            Trending right now
          </Text>
          <View style={styles.trendingWrap}>
            {TRENDING.map((t, i) => (
              <FadeIn key={t.label} index={i}>
                <Pressable
                  style={styles.trendingChip}
                  onPress={() => {
                    setQuery(t.label);
                    rememberSearch(t.label);
                  }}
                >
                  <Text style={styles.trendingText}>{t.label}</Text>
                </Pressable>
              </FadeIn>
            ))}
          </View>

          {/* Category grid */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Shop by Category</Text>
          <View style={styles.catGrid}>
            {categories.map((cat, i) => {
              const accent = colors.primary;
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <FadeIn key={cat.id} index={i} style={{ width: catCardWidth }}>
                  <Pressable
                    style={styles.catCard}
                    onPress={() => setSelectedCatId(cat.id)}
                  >
                    {resolveImage(cat.image, cat.image) ? (
                      <Image
                        source={resolveImage(cat.image, cat.image)!}
                        style={styles.catImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.catImage, { backgroundColor: colors.accentLight }]} />
                    )}
                    <View style={styles.catCardBody}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={[styles.catCount, { color: accent }]}>{count} items ›</Text>
                    </View>
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        </ScrollView>

      ) : filtered.length === 0 ? (
        /* ── Empty results ── */
        <View style={styles.emptyState}>
          <Ionicons name="search" size={38} color={colors.border} />
          <Text style={[typography.subheading, { textAlign: 'center', marginTop: spacing.sm }]}>
            Nothing found
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs }]}>
            {query ? `No products match "${query}"` : 'No products in this category yet'}
          </Text>
          <View style={styles.suggestWrap}>
            <Text style={styles.suggestLabel}>Try instead:</Text>
            <View style={styles.suggestChips}>
              {TRENDING.slice(0, 4).map(t => (
                <Pressable key={t.label} style={styles.suggestChip} onPress={() => { clearAll(); setQuery(t.label); rememberSearch(t.label); }}>
                  <Text style={styles.suggestText}>{t.emoji} {t.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

      ) : (
        /* ── Results grid ── */
        <FlatList
          key={columns}
          data={filtered}
          keyExtractor={p => p.id}
          numColumns={columns}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          renderItem={({ item, index }) => (
            <FadeIn index={index}>
              <View style={{ width: cardWidth }}>
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
            </FadeIn>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    /* ── Header ── */
    header: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      gap: spacing.sm,
    },
    searchBarFocused: {
      backgroundColor: colors.surface,
      borderColor: colors.primary,
    },
    searchIcon: {
      fontSize: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearIcon: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '800',
    },

    /* ── Category chips ── */
    chipsWrapper: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    chips: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipEmoji: {
      fontSize: 13,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },

    /* ── Active filter bar ── */
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.primaryLight,
    },
    filterLabel: {
      fontSize: 13,
      color: colors.primary,
      flex: 1,
    },
    filterBold: {
      fontWeight: '700',
    },
    clearFilter: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    clearFilterText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    /* ── Browse ── */
    browseContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl * 2,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.2,
      marginBottom: spacing.md,
    },

    /* Recent searches */
    recentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    recentClear: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.md,
    },
    recentWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    recentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    recentIcon: {
      fontSize: 12,
    },
    recentText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    recentRemove: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      paddingLeft: 2,
    },

    /* Trending */
    trendingWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    trendingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    trendingEmoji: {
      fontSize: 15,
    },
    trendingText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },

    /* Category grid */
    catGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    catCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    catImage: {
      width: '100%',
      height: 90,
      backgroundColor: colors.surfaceMuted,
    },
    catCardBody: {
      padding: spacing.sm,
      gap: 2,
    },
    catName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    catCount: {
      fontSize: 12,
      fontWeight: '600',
    },

    /* ── Results grid ── */
    grid: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    gridRow: {
      gap: spacing.md,
    },

    /* ── Empty state ── */
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    emptyEmoji: {
      fontSize: 52,
    },
    suggestWrap: {
      marginTop: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    suggestLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    suggestChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    suggestChip: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    suggestText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}
