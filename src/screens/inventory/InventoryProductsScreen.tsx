import { Feather } from '@expo/vector-icons';
import { resolveImage } from '../../data/productImages';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormInput } from '../../components/FormInput';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Skeleton } from '../../components/Skeleton';
import { Category } from '../../data/categories';
import { ProductWithStock } from '../../services/catalog';
import {
  createProduct,
  deleteProduct,
  LOW_STOCK_THRESHOLD,
  ProductInput,
  updateProduct,
  updateStock,
} from '../../services/inventory';
import { useCatalog } from '../../state/CatalogContext';
import { useTheme } from '../../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../../theme';
import { confirm } from '../../utils/confirm';

type FormState = {
  name: string;
  unit: string;
  price: string;
  mrp: string;
  categoryId: string;
  description: string;
  image: string;
  stock: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  unit: '',
  price: '',
  mrp: '',
  categoryId: '',
  description: '',
  image: '',
  stock: '0',
};

function toFormState(product: ProductWithStock): FormState {
  return {
    name: product.name,
    unit: product.unit,
    price: String(product.price),
    mrp: product.mrp !== undefined ? String(product.mrp) : '',
    categoryId: product.categoryId,
    description: product.description,
    image: product.image,
    stock: String(product.stock),
  };
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim() === '') errors.name = 'Required';
  if (form.unit.trim() === '') errors.unit = 'Required';
  if (form.categoryId === '') errors.categoryId = 'Pick a category';
  if (form.description.trim() === '') errors.description = 'Required';
  if (form.image.trim() === '') errors.image = 'Required';

  const price = Number(form.price);
  if (form.price.trim() === '' || Number.isNaN(price) || price <= 0) {
    errors.price = 'Enter a valid price';
  }

  if (form.mrp.trim() !== '') {
    const mrp = Number(form.mrp);
    if (Number.isNaN(mrp) || mrp <= price) errors.mrp = 'MRP must be higher than price';
  }

  const stock = Number(form.stock);
  if (form.stock.trim() === '' || Number.isNaN(stock) || stock < 0) {
    errors.stock = 'Enter a valid quantity';
  }

  return errors;
}

export function InventoryProductsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { products, categories, isLoading, error, reload } = useCatalog();

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [modalProduct, setModalProduct] = useState<ProductWithStock | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products
      .filter((p) => (categoryFilter ? p.categoryId === categoryFilter : true))
      .filter((p) => search === '' || p.name.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, categoryFilter, query]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const handleDelete = async (product: ProductWithStock) => {
    /* The old copy implied this might be refused for a product with order
       history. It never is -- there is no foreign key, by design -- so the
       confirmation has to carry the weight instead, and point at the reversible
       option the bakery already uses every morning. */
    const ok = await confirm(
      `Permanently delete ${product.name}?`,
      'This cannot be undone. Past orders keep their own record of the name and price, ' +
        'but the item itself is gone and would have to be added again from scratch.\n\n' +
        'To just take it off sale, set its stock to 0 on the Stock tab instead.',
      'Delete forever',
      'Cancel',
    );
    if (!ok) return;

    setDeletingId(product.id);
    setListError(null);
    try {
      await deleteProduct(product.id);
      reload();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = ({ item }: { item: ProductWithStock }) => {
    const state = item.stock === 0 ? 'out' : item.stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';
    const isDeleting = deletingId === item.id;

    return (
      <Pressable style={styles.row} onPress={() => setModalProduct(item)}>
        {resolveImage(item.id, item.image) ? (
          <Image source={resolveImage(item.id, item.image)!} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 22 }}>{item.image}</Text>
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowMeta}>
            {categoryName(item.categoryId)} · {item.unit}
          </Text>
          <View style={styles.rowPriceLine}>
            <Text style={styles.rowPrice}>₹{item.price}</Text>
            {item.mrp !== undefined && <Text style={styles.rowMrp}>₹{item.mrp}</Text>}
            <View style={[styles.pill, styles[`pill_${state}`]]}>
              <Text style={[styles.pillText, styles[`pillText_${state}`]]}>
                {state === 'out' ? 'Out of stock' : state === 'low' ? 'Low stock' : `${item.stock} in stock`}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          disabled={isDeleting}
          hitSlop={8}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Feather name="trash-2" size={16} color={colors.danger} />
          )}
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenContainer>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Catalogue</Text>
            <Text style={styles.title}>Products</Text>
            <Text style={styles.subtitle}>
              {products.length} item{products.length === 1 ? '' : 's'} on the menu
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setModalProduct('new')}>
            <Feather name="plus" size={16} color={colors.textOnPrimary} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            style={[styles.chip, categoryFilter === null && styles.chipActive]}
            onPress={() => setCategoryFilter(null)}
          >
            <Text style={[styles.chipText, categoryFilter === null && styles.chipTextActive]}>
              All
            </Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, categoryFilter === c.id && styles.chipActive]}
              onPress={() => setCategoryFilter(c.id)}
            >
              <Text style={[styles.chipText, categoryFilter === c.id && styles.chipTextActive]}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {listError && (
          <View style={styles.banner}>
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={styles.bannerText}>{listError}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.stateWrap}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                height={76}
                borderRadius={radius.lg}
                style={{ marginBottom: spacing.sm }}
              />
            ))}
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Feather name="wifi-off" size={32} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Couldn't load products</Text>
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
            contentContainerStyle={[styles.listContent, visible.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <Feather name="package" size={32} color={colors.textMuted} />
                <Text style={styles.stateTitle}>No products match</Text>
                <Text style={styles.stateBody}>Try a different search or category.</Text>
              </View>
            }
          />
        )}
      </ScreenContainer>

      {modalProduct !== null && (
        <ProductFormModal
          product={modalProduct === 'new' ? null : modalProduct}
          categories={categories}
          onClose={() => setModalProduct(null)}
          onSaved={() => {
            setModalProduct(null);
            reload();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ProductFormModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductWithStock | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEditing = product !== null;

  const [form, setForm] = useState<FormState>(product ? toFormState(product) : EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setField = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSave = async () => {
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const input: ProductInput = {
      name: form.name.trim(),
      unit: form.unit.trim(),
      price: Number(form.price),
      mrp: form.mrp.trim() === '' ? undefined : Number(form.mrp),
      categoryId: form.categoryId,
      description: form.description.trim(),
      image: form.image.trim(),
    };
    const stock = Number(form.stock);

    setIsSaving(true);
    setSaveError(null);
    try {
      if (isEditing) {
        await updateProduct(product.id, input);
        if (stock !== product.stock) await updateStock(product.id, stock);
      } else {
        await createProduct({ ...input, stock });
      }
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
          <Pressable onPress={handleSave} disabled={isSaving} hitSlop={10}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.modalSave}>Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {form.image.trim() !== '' && (
            resolveImage(form.image, form.image) ? (
              <Image source={resolveImage(form.image, form.image)!} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={[styles.previewImage, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 26 }}>{form.image}</Text>
              </View>
            )
          )}

          <FormInput label="Name" value={form.name} onChangeText={setField('name')} error={errors.name} placeholder="Black Forest Cake" />
          {/* Images are bundled assets keyed by product id (see productImages.ts).
              A photo URL still works, and an emoji stands in when neither exists. */}
          <FormInput label="Photo" value={form.image} onChangeText={setField('image')} error={errors.image} placeholder="Emoji, or https://… for a hosted photo" autoCapitalize="none" />

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <FormInput label="Unit" value={form.unit} onChangeText={setField('unit')} error={errors.unit} placeholder="500g" />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput label="Stock" value={form.stock} onChangeText={setField('stock')} error={errors.stock} placeholder="0" keyboardType="number-pad" />
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <FormInput label="Price (₹)" value={form.price} onChangeText={setField('price')} error={errors.price} placeholder="35" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput label="MRP (₹, optional)" value={form.mrp} onChangeText={setField('mrp')} error={errors.mrp} placeholder="45" keyboardType="decimal-pad" />
            </View>
          </View>

          <View style={styles.wrap}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryPicker}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.chip, form.categoryId === c.id && styles.chipActive]}
                  onPress={() => setField('categoryId')(c.id)}
                >
                  <Text style={[styles.chipText, form.categoryId === c.id && styles.chipTextActive]}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {errors.categoryId && <Text style={styles.fieldError}>{errors.categoryId}</Text>}
          </View>

          <View style={styles.wrap}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              value={form.description}
              onChangeText={setField('description')}
              placeholder="Short, honest description shown on the product page"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
            {errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
          </View>

          {saveError && (
            <View style={styles.banner}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.bannerText}>{saveError}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    addButtonText: { fontSize: 13, fontWeight: '800', color: colors.textOnPrimary },

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
    listEmpty: { flexGrow: 1, justifyContent: 'center' },
    eyebrow: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      color: colors.primary,
      marginBottom: 1,
    },

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
    thumb: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
    rowBody: { flex: 1, gap: 3 },
    rowName: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowMeta: { fontSize: 12, color: colors.textMuted },
    rowPriceLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
    rowPrice: { fontSize: 14, fontWeight: '800', color: colors.text },
    rowMrp: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },

    pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
    pill_ok: { backgroundColor: colors.primaryLight },
    pill_low: { backgroundColor: colors.accentLight },
    pill_out: { backgroundColor: colors.surfaceMuted },
    pillText: { fontSize: 10, fontWeight: '800' },
    pillText_ok: { color: colors.success },
    pillText_low: { color: colors.accent },
    pillText_out: { color: colors.danger },

    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },

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

    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalCancel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    modalSave: { fontSize: 15, color: colors.primary, fontWeight: '800' },
    modalContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

    previewImage: {
      width: '100%',
      height: 160,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
    },
    rowFields: { flexDirection: 'row', gap: spacing.md },

    wrap: { gap: spacing.xs / 2 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    fieldError: { fontSize: 12, color: colors.danger },
    categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    descriptionInput: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: 15,
      color: colors.text,
      minHeight: 90,
      textAlignVertical: 'top',
    },
  });
}
