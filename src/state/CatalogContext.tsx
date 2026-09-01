import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Category } from '../data/categories';
import { fetchCategories, fetchProducts, ProductWithStock } from '../services/catalog';
import { errorMessage } from '../utils/errorMessage';

type CatalogContextValue = {
  products: ProductWithStock[];
  categories: Category[];
  getProductById: (id: string) => ProductWithStock | undefined;
  isLoading: boolean;
  error: string | null;
  refetchProducts: () => Promise<void>;
  reload: () => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load catalog')))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const refetchProducts = useCallback(async () => {
    const productsData = await fetchProducts();
    setProducts(productsData);
  }, []);

  const getProductById = (id: string) => products.find((p) => p.id === id);

  return (
    <CatalogContext.Provider
      value={{ products, categories, getProductById, isLoading, error, refetchProducts, reload }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within a CatalogProvider');
  return context;
}
