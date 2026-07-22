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
    const storedBarcode = product.barcode?.trim();
    const hasFactorySerial = Boolean(product.serialNumber?.trim());

    const barcode =
      storedBarcode ||
      (hasFactorySerial
        ? `899${String(index + 1).padStart(10, "0")}`
        : productCode);

    return {
      ...product,
      productCode,
      barcode,
    };
  });
}

export function findProductByExactBarcode(
  catalog: CatalogProduct[],
  scannedCode: string,
): CatalogProduct | undefined {
  const code = scannedCode.trim();
  if (!code) return undefined;
  return catalog.find((product) => product.barcode === code);
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

/** Pencarian: nama, barcode, id, serial, kode barang (BRG-xxx) */
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
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.barcode.toLowerCase().includes(q)) return true;
    if (p.id.toLowerCase().includes(q)) return true;

    const haystack = [p.productCode, p.serialNumber ?? "", p.category]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}
