import { categories as localCategories, Category } from '../data/categories';
import { products as localProducts, Product } from '../data/products';
import { fetchProductOverlay, fetchStockOverrides } from './inventory';
import { supabase } from './supabase';

/* The Supabase project is still seeded with the old grocery catalog, so the
   bakery menu in src/data is the source of truth until it is re-seeded. Flip
   this off once `products`/`categories` hold Lajwab's real rows. */
const USE_LOCAL_CATALOG = true;

const DEMO_STOCK = 25;

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp: number | null;
  image: string;
  category_id: string;
  description: string;
  stock: number;
};

type CategoryRow = {
  id: string;
  name: string;
  image: string;
};

export type ProductWithStock = Product & { stock: number };

function mapProduct(row: ProductRow): ProductWithStock {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: row.price,
    mrp: row.mrp ?? undefined,
    image: row.image,
    categoryId: row.category_id,
    description: row.description,
    stock: row.stock,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  if (USE_LOCAL_CATALOG) return localCategories;

  const { data, error } = await supabase.from('categories').select('id, name, image');
  if (error) throw error;
  return (data as CategoryRow[]).map((row) => ({ id: row.id, name: row.name, image: row.image }));
}

export async function fetchProducts(): Promise<ProductWithStock[]> {
  const [result, stockOverrides, productOverlay] = await Promise.all([
    USE_LOCAL_CATALOG
      ? Promise.resolve({ data: [] as ProductRow[], error: null })
      : supabase
          .from('products')
          .select('id, name, unit, price, mrp, image, category_id, description, stock'),
    fetchStockOverrides(),
    fetchProductOverlay(),
  ]);
  if (result.error) throw result.error;

  const deletedIds = new Set(productOverlay.deletedIds);
  const withStock = (id: string, product: Product): ProductWithStock => {
    const override = stockOverrides[id];
    return { ...product, stock: override === undefined ? 0 : override };
  };

  const base = (result.data as ProductRow[])
    .filter((row) => !deletedIds.has(row.id))
    .map((row) => {
      const product = mapProduct(row);
      const edit = productOverlay.edits[product.id];
      const stockOverride = stockOverrides[product.id];
      const merged = edit ? { ...product, ...edit } : product;
      return stockOverride === undefined ? merged : { ...merged, stock: stockOverride };
    });

  // Locally created products have no server row to fetch stock from —
  // fall back to 0 rather than the undefined that withStock would otherwise need.
  const added = productOverlay.added
    .filter((p) => !deletedIds.has(p.id))
    .map((p) => withStock(p.id, p));

  // Local catalog rows have no server stock column, so they start fully stocked
  // and are then subject to the same admin edits/overrides as server rows.
  const local = USE_LOCAL_CATALOG
    ? localProducts
        .filter((p) => !deletedIds.has(p.id))
        .map((p) => {
          const edit = productOverlay.edits[p.id];
          const merged = edit ? { ...p, ...edit } : p;
          const override = stockOverrides[p.id];
          return { ...merged, stock: override === undefined ? DEMO_STOCK : override };
        })
    : [];

  return [...added, ...local, ...base];
}
