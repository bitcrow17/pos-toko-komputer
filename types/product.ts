/** Kategori produk toko komputer */
export type ProductCategory =
  | "laptop"
  | "desktop"
  | "monitor"
  | "keyboard"
  | "mouse"
  | "storage"
  | "ram"
  | "gpu"
  | "cpu"
  | "accessory"
  | "other";

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
