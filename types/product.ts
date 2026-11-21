/** Kategori produk toko komputer & servis */
export type ProductCategory =
  // Printer & Tinta
  | "ink_toner"
  | "printer_scanner"
  // Komputer & Laptop
  | "laptop"
  | "desktop"
  | "monitor"
  // Komponen PC / Laptop
  | "component"
  | "storage"
  | "ram"
  | "gpu"
  | "cpu"
  // Jaringan & Keamanan
  | "networking"
  | "cctv_security"
  // Aksesoris & Kabel
  | "accessory"
  | "cable_connector"
  | "keyboard"
  | "mouse"
  // Jasa & Lainnya
  | "service_fee"
  | "other";

/** Grup kategori untuk pengelompokan dropdown yang rapi */
export interface CategoryGroup {
  group: string;
  items: ProductCategory[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Printer & Tinta",
    items: ["ink_toner", "printer_scanner"],
  },
  {
    group: "Unit Komputer & Layar",
    items: ["laptop", "desktop", "monitor"],
  },
  {
    group: "Komponen PC / Laptop",
    items: ["component", "storage", "ram", "cpu", "gpu"],
  },
  {
    group: "Jaringan & Keamanan",
    items: ["networking", "cctv_security"],
  },
  {
    group: "Aksesoris & Kabel",
    items: ["accessory", "cable_connector", "keyboard", "mouse"],
  },
  {
    group: "Layanan & Lainnya",
    items: ["service_fee", "other"],
  },
];

/** Daftar seluruh kategori produk dalam urutan kelompok */
export const CATEGORIES: ProductCategory[] = CATEGORY_GROUPS.flatMap(
  (g) => g.items,
);

/** Label representasi nama kategori dalam Bahasa Indonesia */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  ink_toner: "Tinta & Toner",
  printer_scanner: "Printer & Scanner",
  laptop: "Laptop",
  desktop: "Desktop PC",
  monitor: "Monitor",
  component: "Komponen PC / Laptop",
  storage: "Storage (SSD / HDD)",
  ram: "RAM / Memori",
  cpu: "Processor (CPU)",
  gpu: "VGA Card (GPU)",
  networking: "Jaringan (Networking)",
  cctv_security: "CCTV & Keamanan",
  accessory: "Aksesoris",
  cable_connector: "Kabel & Konektor",
  keyboard: "Keyboard",
  mouse: "Mouse",
  service_fee: "Jasa / Servis",
  other: "Lainnya",
};

/** Fungsi aman untuk mendapatkan label kategori produk */
export function getCategoryLabel(category: string | undefined | null): string {
  if (!category) return "Lainnya";
  return (
    CATEGORY_LABELS[category as ProductCategory] || category
  );
}

/** Data produk inventori */
export interface Product {
  /** ID unik produk */
  id: string;
  /** Nama produk */
  name: string;
  /** Kategori produk */
  category: ProductCategory;
  /** Harga beli dari supplier (IDR) */
  purchasePrice: number;
  /** Harga jual ke pelanggan (IDR) */
  sellingPrice: number;
  /** Jumlah stok tersedia */
  stock: number;
  /** Nomor seri perangkat (opsional untuk beberapa kategori) */
  serialNumber?: string;
  /** Kode barcode untuk scan di kasir (opsional) */
  barcode?: string;
  /** Batas stok minimum untuk peringatan restock (opsional) */
  minimumStock?: number;
}
