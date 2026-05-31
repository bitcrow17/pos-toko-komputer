import type { CartItem } from "@/types/cart";
import type { CatalogProduct } from "@/lib/kasir-catalog";
import { findProductById } from "@/lib/kasir-catalog";

export type CartAlert = {
  type: "error" | "info";
  message: string;
};

function createCartItemId(): string {
  return `CI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function addToCart(
  items: CartItem[],
  product: CatalogProduct,
): { items: CartItem[]; alert: CartAlert | null } {
  if (product.stock <= 0) {
    return {
      items,
      alert: {
        type: "error",
        message: `${product.name} stok habis — tidak bisa ditambahkan.`,
      },
    };
  }

  const existing = items.find((item) => item.productId === product.id);

  if (existing) {
    if (existing.quantity >= product.stock) {
      return {
        items,
        alert: {
          type: "error",
          message: `Stok ${product.name} maksimal ${product.stock} unit.`,
        },
      };
    }

    return {
      items: items.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
      alert: null,
    };
  }

  return {
    items: [
      ...items,
      {
        id: createCartItemId(),
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: 1,
        unitSellingPrice: product.sellingPrice,
        serialNumber: product.serialNumber,
      },
    ],
    alert: null,
  };
}

export function updateQuantity(
  items: CartItem[],
  catalog: CatalogProduct[],
  productId: string,
  newQty: number,
): { items: CartItem[]; alert: CartAlert | null } {
  if (newQty < 1) {
    return {
      items: removeFromCart(items, productId),
      alert: null,
    };
  }

  const product = findProductById(catalog, productId);
  if (!product) {
    return {
      items,
      alert: { type: "error", message: "Produk tidak ditemukan di katalog." },
    };
  }

  if (newQty > product.stock) {
    return {
      items,
      alert: {
        type: "error",
        message: `Qty maksimal ${product.stock} untuk ${product.name}.`,
      },
    };
  }

  return {
    items: items.map((item) =>
      item.productId === productId ? { ...item, quantity: newQty } : item,
    ),
    alert: null,
  };
}

export function removeFromCart(
  items: CartItem[],
  productId: string,
): CartItem[] {
  return items.filter((item) => item.productId !== productId);
}
