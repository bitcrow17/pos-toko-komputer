"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mockCustomers, mockProducts } from "@/src/data/mockData";
import { createNextProductId } from "@/lib/admin-product";
import {
  applyCustomerUpdate,
  buildCustomerFromInput,
  validateCustomerInput,
} from "@/lib/customer";
import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";
import type { Customer, CustomerInput } from "@/types/customer";
import type { Debt, DebtInput, DebtPaymentLog, DebtStatus } from "@/types/debt";
import {
  buildDebtFromInput,
  computeDebtStatus,
  generatePaymentLogId,
  validateDebtInput,
} from "@/lib/debt";

export type { Debt, DebtInput, DebtPaymentLog, DebtStatus };
export type { Customer, CustomerInput };

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
  debts: Debt[];
  customers: Customer[];
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addProduct: (product: ProductInput) => void;
  importProducts: (products: ProductInput[]) => void;
  updateProduct: (id: string, updates: ProductInput) => void;
  deleteProduct: (id: string) => void;
  deleteMultipleProducts: (ids: string[]) => void;
  clearAllProducts: () => void;
  reduceStock: (productId: string, quantity: number) => void;
  addTransaction: (transaction: Transaction) => void;
  addDebt: (debtData: DebtInput) => Debt;
  payDebt: (debtId: string, paymentAmount: number, note?: string) => void;
  addCustomer: (customerData: CustomerInput) => Customer;
  updateCustomer: (id: string, customerData: CustomerInput) => void;
  deleteCustomer: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    mockProducts.map((p) => ({ ...p })),
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const debtsRef = useRef<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(() =>
    mockCustomers.map((c) => ({ ...c })),
  );
  const customersRef = useRef<Customer[]>(customers);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    debtsRef.current = debts;
  }, [debts]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

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

  const importProducts = useCallback((items: ProductInput[]) => {
    if (items.length === 0) return;
    setProducts((prev) => {
      const next = [...prev];
      for (const item of items) {
        next.push({ id: createNextProductId(next), ...item });
      }
      return next;
    });
  }, []);

  const updateProduct = useCallback((id: string, updates: ProductInput) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, id } : p)),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const deleteMultipleProducts = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, []);

  const clearAllProducts = useCallback(() => {
    setProducts([]);
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

  const addDebt = useCallback((debtData: DebtInput): Debt => {
    const validationError = validateDebtInput(debtData);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = buildDebtFromInput(debtsRef.current, debtData);
    const nextDebts = [created, ...debtsRef.current];
    debtsRef.current = nextDebts;
    setDebts(nextDebts);
    return created;
  }, []);

  const payDebt = useCallback(
    (debtId: string, paymentAmount: number, note?: string) => {
      if (paymentAmount <= 0) return;

      let appliedAmount = 0;

      setDebts((prev) => {
        const next = prev.map((debt) => {
          if (debt.id !== debtId) return debt;

          const amount = Math.min(paymentAmount, debt.remainingAmount);
          if (amount <= 0) return debt;

          appliedAmount = amount;
          const paidAmount = debt.paidAmount + amount;
          const remainingAmount = Math.max(0, debt.totalAmount - paidAmount);

          return {
            ...debt,
            paidAmount,
            remainingAmount,
            status: computeDebtStatus(debt.totalAmount, paidAmount),
            paymentHistory: [
              ...debt.paymentHistory,
              {
                id: generatePaymentLogId(),
                date: new Date().toISOString(),
                amount,
                note,
              },
            ],
          };
        });
        debtsRef.current = next;
        return next;
      });

      if (appliedAmount > 0) {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.debtId === debtId
              ? { ...tx, nominalBayar: tx.nominalBayar + appliedAmount }
              : tx,
          ),
        );
      }
    },
    [],
  );

  const addCustomer = useCallback((customerData: CustomerInput): Customer => {
    const validationError = validateCustomerInput(customerData);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = buildCustomerFromInput(customersRef.current, customerData);
    const next = [created, ...customersRef.current];
    customersRef.current = next;
    setCustomers(next);
    return created;
  }, []);

  const updateCustomer = useCallback(
    (id: string, customerData: CustomerInput) => {
      const validationError = validateCustomerInput(customerData);
      if (validationError) {
        throw new Error(validationError);
      }

      setCustomers((prev) => {
        const next = prev.map((customer) =>
          customer.id === id
            ? applyCustomerUpdate(customer, customerData)
            : customer,
        );
        customersRef.current = next;
        return next;
      });
    },
    [],
  );

  const deleteCustomer = useCallback((id: string) => {
    const hasOpenDebt = debtsRef.current.some(
      (debt) =>
        debt.customerId === id &&
        debt.remainingAmount > 0 &&
        debt.status !== "PAID",
    );
    if (hasOpenDebt) {
      throw new Error(
        "Pelanggan masih memiliki sisa utang. Lunasi terlebih dahulu sebelum menghapus.",
      );
    }

    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      customersRef.current = next;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      products,
      transactions,
      debts,
      customers,
      currentUser,
      login,
      logout,
      addProduct,
      importProducts,
      updateProduct,
      deleteProduct,
      deleteMultipleProducts,
      clearAllProducts,
      reduceStock,
      addTransaction,
      addDebt,
      payDebt,
      addCustomer,
      updateCustomer,
      deleteCustomer,
    }),
    [
      products,
      transactions,
      debts,
      customers,
      currentUser,
      login,
      logout,
      addProduct,
      importProducts,
      updateProduct,
      deleteProduct,
      deleteMultipleProducts,
      clearAllProducts,
      reduceStock,
      addTransaction,
      addDebt,
      payDebt,
      addCustomer,
      updateCustomer,
      deleteCustomer,
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
