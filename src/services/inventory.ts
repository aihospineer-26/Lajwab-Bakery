import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LOCAL_STOCK_KEY = 'local_stock_overrides';

export const LOW_STOCK_THRESHOLD = 10;

type StockOverrides = Record<string, number>;

async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

async function readOverrides(): Promise<StockOverrides> {
  const raw = await AsyncStorage.getItem(LOCAL_STOCK_KEY);
  if (raw == null) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StockOverrides) : {};
  } catch {
    await AsyncStorage.removeItem(LOCAL_STOCK_KEY);
    return {};
  }
}

function normalize(stock: number): number {
  return Math.max(0, Math.round(stock));
}

/* Preview mode has no session, so RLS rejects writes to products. Keeping edits
   in a local overlay means the same screens and call sites work either side of
   sign-in, and a signed-in staff member always reads the real table. */
export async function fetchStockOverrides(): Promise<StockOverrides> {
  if (await hasSession()) return {};
  return readOverrides();
}

export async function updateStock(productId: string, stock: number): Promise<void> {
  const next = normalize(stock);

  if (await hasSession()) {
    const { error } = await supabase.from('products').update({ stock: next }).eq('id', productId);
    if (error) throw error;
    return;
  }

  const overrides = await readOverrides();
  overrides[productId] = next;
  await AsyncStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(overrides));
}

/* Bakery stock is "what we baked today", not a warehouse count. The owner
   zeroes everything at the start of the day and then enters what came out of
   the oven. Signed in this is one statement; in preview mode it rewrites the
   local overlay in one go rather than one write per product. */
export async function resetAllStock(productIds: string[], value = 0): Promise<void> {
  const next = normalize(value);

  if (await hasSession()) {
    const { error } = await supabase
      .from('products')
      .update({ stock: next })
      .in('id', productIds);
    if (error) throw error;
    return;
  }

  const overrides = await readOverrides();
  productIds.forEach((id) => {
    overrides[id] = next;
  });
  await AsyncStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(overrides));
}

export async function clearStockOverrides(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_STOCK_KEY);
}

/* ---------- Product CRUD ---------- */

export type ProductInput = {
  name: string;
  unit: string;
  price: number;
  mrp?: number;
  image: string;
  categoryId: string;
  description: string;
};

type ProductOverlay = {
  added: (ProductInput & { id: string })[];
  edits: Record<string, Partial<ProductInput>>;
  deletedIds: string[];
};

const LOCAL_PRODUCTS_KEY = 'local_product_overlay';
const EMPTY_PRODUCT_OVERLAY: ProductOverlay = { added: [], edits: {}, deletedIds: [] };

async function readProductOverlay(): Promise<ProductOverlay> {
  const raw = await AsyncStorage.getItem(LOCAL_PRODUCTS_KEY);
  if (raw == null) return EMPTY_PRODUCT_OVERLAY;
  try {
    const parsed = JSON.parse(raw);
    return {
      added: Array.isArray(parsed?.added) ? parsed.added : [],
      edits: parsed?.edits && typeof parsed.edits === 'object' ? parsed.edits : {},
      deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [],
    };
  } catch {
    await AsyncStorage.removeItem(LOCAL_PRODUCTS_KEY);
    return EMPTY_PRODUCT_OVERLAY;
  }
}

async function writeProductOverlay(overlay: ProductOverlay): Promise<void> {
  await AsyncStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(overlay));
}

/* Mirrors fetchStockOverrides — preview mode has no session, so catalogue
   writes land here instead of Supabase. catalog.ts merges this over the base
   product list on every read. */
export async function fetchProductOverlay(): Promise<ProductOverlay> {
  if (await hasSession()) return EMPTY_PRODUCT_OVERLAY;
  return readProductOverlay();
}

function generateLocalId(): string {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function toRow(input: Partial<ProductInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.unit !== undefined) row.unit = input.unit;
  if (input.price !== undefined) row.price = input.price;
  if (input.mrp !== undefined) row.mrp = input.mrp ?? null;
  if (input.image !== undefined) row.image = input.image;
  if (input.categoryId !== undefined) row.category_id = input.categoryId;
  if (input.description !== undefined) row.description = input.description;
  return row;
}

export async function createProduct(input: ProductInput & { stock: number }): Promise<string> {
  if (await hasSession()) {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...toRow(input), stock: normalize(input.stock) })
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  const id = generateLocalId();
  const overlay = await readProductOverlay();
  overlay.added.push({
    id,
    name: input.name,
    unit: input.unit,
    price: input.price,
    mrp: input.mrp,
    image: input.image,
    categoryId: input.categoryId,
    description: input.description,
  });
  await writeProductOverlay(overlay);
  await updateStock(id, input.stock);
  return id;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  if (await hasSession()) {
    const { error } = await supabase.from('products').update(toRow(patch)).eq('id', id);
    if (error) throw error;
    return;
  }

  const overlay = await readProductOverlay();
  const addedIndex = overlay.added.findIndex((p) => p.id === id);
  if (addedIndex !== -1) {
    overlay.added[addedIndex] = { ...overlay.added[addedIndex], ...patch };
  } else {
    overlay.edits[id] = { ...overlay.edits[id], ...patch };
  }
  await writeProductOverlay(overlay);
}

export async function deleteProduct(id: string): Promise<void> {
  if (await hasSession()) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    // A product referenced by past orders is protected by a foreign key —
    // failing loudly here is correct; silently deleting would corrupt history.
    if (error) throw new Error('Could not delete this product — it may appear in past orders.');
    return;
  }

  const overlay = await readProductOverlay();
  overlay.added = overlay.added.filter((p) => p.id !== id);
  delete overlay.edits[id];
  if (!overlay.deletedIds.includes(id)) overlay.deletedIds.push(id);
  await writeProductOverlay(overlay);
}

/* The server's place_order decrements stock inside the same transaction as the
   insert. Preview mode has no such transaction, so the overlay has to be
   decremented by hand or the inventory screen would report stock the store has
   already sold. Signed-in callers must not use this — they would double-count. */
export async function decrementLocalStock(
  items: { productId: string; qty: number }[],
): Promise<void> {
  if (items.length === 0) return;

  const overrides = await readOverrides();
  const unknown = items.filter((i) => overrides[i.productId] === undefined).map((i) => i.productId);

  /* Products edited in the dashboard already have an overlay value; the rest
     still need their baseline read from the catalogue. */
  if (unknown.length > 0) {
    const { data } = await supabase.from('products').select('id, stock').in('id', unknown);
    (data as { id: string; stock: number }[] | null)?.forEach((row) => {
      overrides[row.id] = row.stock;
    });
  }

  items.forEach((item) => {
    const current = overrides[item.productId];
    if (current === undefined) return;
    overrides[item.productId] = Math.max(0, current - item.qty);
  });

  await AsyncStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(overrides));
}
