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
    barcode: "8991234567890",
  },
  {
    id: "prd-002",
    name: "Monitor LG 24 inci",
    category: "monitor",
    purchasePrice: 1_800_000,
    sellingPrice: 2_299_000,
    stock: 12,
    barcode: "8999876543210",
  },
  {
    id: "prd-003",
    name: "SSD Samsung 1TB NVMe",
    category: "storage",
    purchasePrice: 950_000,
    sellingPrice: 1_199_000,
    stock: 20,
    barcode: "8991122334455",
  },
];

/** Data transaksi contoh untuk ringkasan dashboard */
export const mockTransactions: Transaction[] = [
  {
    id: "INV-20260528-001",
    timestamp: "2026-05-28T10:15:00.000Z",
    items: [
      {
        productId: "prd-001",
        productName: "Laptop ASUS VivoBook 15",
        quantity: 1,
        unitPrice: 8_999_000,
      },
    ],
    totalHarga: 8_999_000,
    nominalBayar: 9_000_000,
    kembalian: 1_000,
  },
  {
    id: "INV-20260528-002",
    timestamp: "2026-05-28T14:30:00.000Z",
    items: [
      {
        productId: "prd-002",
        productName: "Monitor LG 24 inci",
        quantity: 1,
        unitPrice: 2_299_000,
      },
    ],
    totalHarga: 2_299_000,
    nominalBayar: 2_300_000,
    kembalian: 1_000,
  },
  {
    id: "INV-20260527-001",
    timestamp: "2026-05-27T09:00:00.000Z",
    items: [
      {
        productId: "prd-003",
        productName: "SSD Samsung 1TB NVMe",
        quantity: 1,
        unitPrice: 1_199_000,
      },
    ],
    totalHarga: 1_199_000,
    nominalBayar: 1_200_000,
    kembalian: 1_000,
  },
  {
    id: "INV-20260526-001",
    timestamp: "2026-05-26T16:45:00.000Z",
    items: [
      {
        productId: "prd-003",
        productName: "SSD Samsung 1TB NVMe",
        quantity: 1,
        unitPrice: 450_000,
      },
    ],
    totalHarga: 450_000,
    nominalBayar: 500_000,
    kembalian: 50_000,
  },
];
