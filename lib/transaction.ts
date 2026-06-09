import type { Transaction } from "@/types/transaction";

/** Generate nomor nota berurutan per hari: INV-YYYYMMDD-001 */
export function generateInvoiceNumber(existing: Transaction[]): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `INV-${y}${m}${d}`;
  const count = existing.filter((t) => t.id.startsWith(prefix)).length;
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

export function getTransactionItemCount(tx: Transaction): number {
  return tx.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getTransactionItemSubtotal(
  item: Transaction["items"][number],
): number {
  return item.quantity * item.unitPrice;
}
