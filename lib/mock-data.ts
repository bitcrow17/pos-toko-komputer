import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";

/** Data produk contoh untuk ringkasan dashboard */
export const mockProducts: Product[] = [
  {
    id: "prd-001",
    name: "Laptop ASUS VivoBook 15",
    category: "laptop",
    purchasePrice: 7_500_000,
    sellingPrice: 8_999_000,
    stock: 5,
  },
  {
    id: "prd-002",
    name: "Monitor LG 24 inci",
    category: "monitor",
    purchasePrice: 1_800_000,
    sellingPrice: 2_299_000,
    stock: 12,
  },
  {
    id: "prd-003",
    name: "SSD Samsung 1TB NVMe",
    category: "storage",
    purchasePrice: 950_000,
    sellingPrice: 1_199_000,
    stock: 20,
  },
];

/** Data transaksi contoh untuk ringkasan dashboard */
export const mockTransactions: Transaction[] = [
  {
    id: "trx-001",
    date: "2026-05-28",
    totalPrice: 8_999_000,
    paymentMethod: "transfer",
  },
  {
    id: "trx-002",
    date: "2026-05-28",
    totalPrice: 2_299_000,
    paymentMethod: "qris",
  },
  {
    id: "trx-003",
    date: "2026-05-27",
    totalPrice: 1_199_000,
    paymentMethod: "cash",
  },
  {
    id: "trx-004",
    date: "2026-05-26",
    totalPrice: 450_000,
    paymentMethod: "debit",
  },
];
