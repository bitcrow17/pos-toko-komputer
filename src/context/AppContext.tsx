"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockProducts } from "@/src/data/mockData";
import { createNextProductId } from "@/lib/admin-product";
import type { Product } from "@/types/product";

export type ProductInput = Omit<Product, "id">;

export interface AppContextValue {
  products: Product[];
  addProduct: (product: ProductInput) => void;
  updateProduct: (id: string, updates: ProductInput) => void;
  deleteProduct: (id: string) => void;
  reduceStock: (productId: string, quantity: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    mockProducts.map((p) => ({ ...p })),
  );

  const addProduct = useCallback((product: ProductInput) => {
    setProducts((prev) => [
      ...prev,
      { id: createNextProductId(prev), ...product },
    ]);
  }, []);

  const updateProduct = useCallback((id: string, updates: ProductInput) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, id } : p)),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reduceStock = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock: Math.max(0, p.stock - quantity) }
          : p,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      reduceStock,
    }),
    [products, addProduct, updateProduct, deleteProduct, reduceStock],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp harus dipakai di dalam AppProvider");
  }
  return context;
}
