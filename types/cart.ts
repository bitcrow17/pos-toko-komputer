import type { ProductCategory } from "./product";

/** Baris item dalam keranjang belanja */
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  unitSellingPrice: number;
  serialNumber?: string;
}

/** Keranjang belanja aktif */
export interface ShoppingCart {
  id: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

/** Subtotal satu baris (quantity × harga jual satuan) */
export function getCartItemSubtotal(item: CartItem): number {
  return item.quantity * item.unitSellingPrice;
}

/** Total seluruh keranjang */
export function getCartTotal(cart: ShoppingCart): number {
  return cart.items.reduce((total, item) => total + getCartItemSubtotal(item), 0);
}

/** Jumlah unit di keranjang (jumlah quantity semua item) */
export function getCartItemCount(cart: ShoppingCart): number {
  return cart.items.reduce((count, item) => count + item.quantity, 0);
}
