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
import type { Transaction } from "@/types/transaction";

export type ProductInput = Omit<Product, "id">;

export type UserRole = "admin" | "kasir";

export interface CurrentUser {
  username: string;
  role: UserRole;
}

const HARDCODED_ACCOUNTS: {
  username: string;
  password: string;
  role: UserRole;
}[] = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "kasir", password: "kasir123", role: "kasir" },
];

export interface AppContextValue {
  products: Product[];
  transactions: Transaction[];
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addProduct: (product: ProductInput) => void;
  updateProduct: (id: string, updates: ProductInput) => void;
  deleteProduct: (id: string) => void;
  reduceStock: (productId: string, quantity: number) => void;
  addTransaction: (transaction: Transaction) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    mockProducts.map((p) => ({ ...p })),
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const login = useCallback((username: string, password: string): boolean => {
    const account = HARDCODED_ACCOUNTS.find(
      (entry) =>
        entry.username === username.trim() && entry.password === password,
    );
    if (!account) return false;

    setCurrentUser({
      username: account.username,
      role: account.role,
    });
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

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

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  }, []);

  const value = useMemo(
    () => ({
      products,
      transactions,
      currentUser,
      login,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      reduceStock,
      addTransaction,
    }),
    [
      products,
      transactions,
      currentUser,
      login,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      reduceStock,
      addTransaction,
    ],
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
