import { mockProducts } from "@/src/data/mockData";
import type { Product } from "@/types/product";

/** Produk katalog kasir dengan kode & barcode untuk pencarian */
export type CatalogProduct = Product & {
  productCode: string;
  barcode: string;
};

/** Format: BRG-001, BRG-002, ... */
export function generateProductCode(sequence: number): string {
  return `BRG-${String(sequence).padStart(3, "0")}`;
}

/**
 * Barang tanpa barcode/serial pabrik mendapat kode otomatis.
 * Barang dengan serial pabrik tetap punya productCode BRG-xxx + barcode terpisah.
 */
export function buildCatalog(products: Product[]): CatalogProduct[] {
  return products.map((product, index) => {
    const productCode = generateProductCode(index + 1);
    const hasFactorySerial = Boolean(product.serialNumber?.trim());

    const barcode = hasFactorySerial
      ? (`899${String(index + 1).padStart(10, "0")}` as string)
      : productCode;

    return {
      ...product,
      productCode,
      barcode,
    };
  });
}

export const catalogProducts: CatalogProduct[] = buildCatalog(mockProducts);

export function findProductById(
  catalog: CatalogProduct[],
  productId: string,
): CatalogProduct | undefined {
  return catalog.find((p) => p.id === productId);
}

export function getAvailableStock(
  catalog: CatalogProduct[],
  productId: string,
  cartItems: { productId: string; quantity: number }[],
): number {
  const product = findProductById(catalog, productId);
  if (!product) return 0;
  const inCart =
    cartItems.find((item) => item.productId === productId)?.quantity ?? 0;
  return product.stock - inCart;
}

/** Pencarian: nama, barcode, serial, kode barang (BRG-xxx), id internal */
/** Kurangi stok sesuai qty di keranjang setelah transaksi selesai */
export function deductStockForCart(
  catalog: CatalogProduct[],
  cartItems: { productId: string; quantity: number }[],
): CatalogProduct[] {
  return catalog.map((product) => {
    const sold = cartItems.find((item) => item.productId === product.id);
    if (!sold) return product;
    return {
      ...product,
      stock: Math.max(0, product.stock - sold.quantity),
    };
  });
}

export function filterCatalog(
  catalog: CatalogProduct[],
  query: string,
): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;

  return catalog.filter((p) => {
    const haystack = [
      p.name,
      p.barcode,
      p.productCode,
      p.id,
      p.serialNumber ?? "",
      p.category,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
