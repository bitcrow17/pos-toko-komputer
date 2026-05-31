import type { CartItem } from "@/types/cart";
import { getCartItemSubtotal } from "@/types/cart";

export type DiscountType = "PERSEN" | "NOMINAL";

export const PPN_RATE = 0.11;

export interface TransactionTotals {
  subtotal: number;
  discountAmount: number;
  amountAfterDiscount: number;
  taxAmount: number;
  grandTotal: number;
}

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + getCartItemSubtotal(item), 0);
}

export function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  if (subtotal <= 0 || discountValue <= 0) return 0;

  if (discountType === "PERSEN") {
    const percent = Math.min(discountValue, 100);
    return Math.round((subtotal * percent) / 100);
  }

  return Math.min(discountValue, subtotal);
}

export function calculateTransactionTotals(
  items: CartItem[],
  isTaxEnabled: boolean,
  discountType: DiscountType,
  discountValue: number,
): TransactionTotals {
  const subtotal = calculateSubtotal(items);
  const discountAmount = calculateDiscountAmount(
    subtotal,
    discountType,
    discountValue,
  );
  const amountAfterDiscount = subtotal - discountAmount;
  const taxAmount = isTaxEnabled
    ? Math.round(amountAfterDiscount * PPN_RATE)
    : 0;
  const grandTotal = amountAfterDiscount + taxAmount;

  return {
    subtotal,
    discountAmount,
    amountAfterDiscount,
    taxAmount,
    grandTotal,
  };
}

export function calculateChange(grandTotal: number, cashPaid: number): number {
  return cashPaid - grandTotal;
}

export function parseCashInput(raw: string): number {
  const parsed = Number(raw.replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
