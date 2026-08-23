import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Skeleton } from '../../components/Skeleton';
import { ProductWithStock } from '../../services/catalog';
import { LOW_STOCK_THRESHOLD, updateStock } from '../../services/inventory';
import { useCatalog } from '../../state/CatalogContext';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';

type StockFilter = 'all' | 'low' | 'out';

const FILTERS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Out of stock' },
];

/* Steppers fire far faster than a round trip; batching per product keeps a
   burst of taps to one write instead of one per tap. */
const WRITE_DEBOUNCE_MS = 500;

export function InventoryStockScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { products, isLoading, error, reload } = useCatalog();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  const stockOf = useCallback(
    (product: ProductWithStock) => edits[product.id] ?? product.stock,
    [edits],
  );

  const commit = useCallback(
    (product: ProductWithStock, next: number) => {
      const safe = Math.max(0, Math.round(next));
      const previous = stockOf(product);
      if (safe === previous) return;

      setEdits((prev) => ({ ...prev, [product.id]: safe }));
      setSaveError(null);

      clearTimeout(timers.current[product.id]);
      timers.current[product.id] = setTimeout(() => {
        updateStock(product.id, safe).catch(() => {
          setEdits((prev) => ({ ...prev, [product.id]: previous }));
          setSaveError(`Could not update ${product.name}. Check your connection.`);
        });
      }, WRITE_DEBOUNCE_MS);
    },
    [stockOf],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setEdits({});
    setDrafts({});
    reload();
    setIsRefreshing(false);
  }, [reload]);

  /* Memoized: this feeds a FlatList and is rebuilt only when its inputs change,
     never on every render. */
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products
      .filter((p) => {
        const stock = edits[p.id] ?? p.stock;
        if (filter === 'low' && (stock === 0 || stock > LOW_STOCK_THRESHOLD)) return false;
        if (filter === 'out' && stock !== 0) return false;
        return search === '' || p.name.toLowerCase().includes(search);
      })
      .sort((a, b) => (edits[a.id] ?? a.stock) - (edits[b.id] ?? b.stock));
  }, [products, edits, filter, query]);

  const counts = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let out = 0;
    products.forEach((p) => {
      const stock = edits[p.id] ?? p.stock;
      if (stock === 0) out += 1;
      else if (stock <= LOW_STOCK_THRESHOLD) low += 1;
      else inStock += 1;
    });
    return { inStock, low, out };
  }, [products, edits]);

  const renderItem = ({ item }: { item: ProductWithStock }) => {
    const stock = stockOf(item);
    const draft = drafts[item.id];
    const state = stock === 0 ? 'out' : stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';

    return (
      <View style={styles.row}>
        <Image source={{ uri: item.image }} style={styles.thumb} resizeMode="cover" />

        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowMeta}>
            {item.unit} · ₹{item.price}
          </Text>
          <View style={[styles.pill, styles[`pill_${state}`]]}>
            <Text style={[styles.pillText, styles[`pillText_${state}`]]}>
              {state === 'out' ? 'Out of stock' : state === 'low' ? 'Low stock' : 'In stock'}
            </Text>
          </View>
        </View>

        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepButton, stock === 0 && styles.stepButtonDisabled]}
            onPress={() => commit(item, stock - 1)}
            disabled={stock === 0}
            hitSlop={6}
          >
            <Feather name="minus" size={16} color={stock === 0 ? colors.textMuted : colors.text} />
          </Pressable>

          <TextInput
            style={styles.stockInput}
            value={draft ?? String(stock)}
            onChangeText={(text) =>
              setDrafts((prev) => ({ ...prev, [item.id]: text.replace(/[^0-9]/g, '') }))
            }
            onBlur={() => {
              if (draft !== undefined && draft !== '') commit(item, Number(draft));
              setDrafts((prev) => {
                const next = { ...prev };
                delete next[item.id];
                return next;
              });
            }}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={4}
          />

          <Pressable style={styles.stepButton} onPress={() => commit(item, stock + 1)} hitSlop={6}>
            <Feather name="plus" size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenContainer>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Inventory</Text>
            <Text style={styles.subtitle}>{products.length} products</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={handleRefresh} hitSlop={8}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatTile value={counts.inStock} label="In stock" tone="ok" colors={colors} />
          <StatTile value={counts.low} label="Low" tone="low" colors={colors} />
          <StatTile value={counts.out} label="Out" tone="out" colors={colors} />
        </View>

        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search products"
            placeholderTextColor={colors.textMuted}
          />
          {query !== '' && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {saveError && (
          <View style={styles.banner}>
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={styles.bannerText}>{saveError}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.stateWrap}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                height={72}
                borderRadius={radius.lg}
                style={{ marginBottom: spacing.sm }}
              />
            ))}
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Feather name="wifi-off" size={32} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Couldn't load inventory</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <Pressable style={styles.stateButton} onPress={reload}>
              <Text style={styles.stateButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <Feather name="package" size={32} color={colors.textMuted} />
                <Text style={styles.stateTitle}>
                  {filter === 'out'
                    ? 'Nothing is out of stock'
                    : filter === 'low'
                      ? 'Nothing is running low'
                      : 'No products match'}
                </Text>
                <Text style={styles.stateBody}>
                  {filter === 'all'
                    ? 'Try a different search term.'
                    : 'Switch to All to see the full catalogue.'}
                </Text>
              </View>
            }
          />
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}

function StatTile({
  value,
  label,
  tone,
  colors,
}: {
  value: number;
  label: string;
  tone: 'ok' | 'low' | 'out';
  colors: ColorPalette;
}) {
  const toneColor =
    tone === 'ok' ? colors.success : tone === 'low' ? colors.accent : colors.danger;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.md,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '900', color: toneColor }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },

    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },

    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      paddingHorizontal: spacing.md,
      height: 42,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' } as any,

    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    chipTextActive: { color: colors.textOnPrimary },

    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    bannerText: { flex: 1, fontSize: 12, color: colors.danger, fontWeight: '600' },

    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    rowBody: { flex: 1, gap: 2 },
    rowName: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowMeta: { fontSize: 12, color: colors.textMuted },

    pill: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
      marginTop: 2,
    },
    pill_ok: { backgroundColor: colors.primaryLight },
    pill_low: { backgroundColor: colors.accentLight },
    pill_out: { backgroundColor: colors.surfaceMuted },
    pillText: { fontSize: 10, fontWeight: '800' },
    pillText_ok: { color: colors.success },
    pillText_low: { color: colors.accent },
    pillText_out: { color: colors.danger },

    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.full,
      padding: 3,
    },
    stepButton: {
      width: 30,
      height: 30,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepButtonDisabled: { opacity: 0.4 },
    stockInput: {
      minWidth: 34,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      paddingVertical: 0,
      outlineStyle: 'none',
    } as any,

    stateWrap: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },
    stateTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
    stateBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
    stateButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    stateButtonText: { fontSize: 14, fontWeight: '700', color: colors.textOnPrimary },
  });
}
