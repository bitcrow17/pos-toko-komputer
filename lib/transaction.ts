import type { Transaction, TransactionType } from "@/types/transaction";

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

/** Nomor nota pelunasan servis: SVC-PAY-YYYYMMDD-001 */
export function generateServicePaymentInvoiceNumber(
  existing: Transaction[],
): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `SVC-PAY-${y}${m}${d}`;
  const count = existing.filter((t) => t.id.startsWith(prefix)).length;
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

export function getTransactionType(tx: Transaction): TransactionType {
  return tx.type ?? "RETAIL";
}

export function getTransactionItemCount(tx: Transaction): number {
  return tx.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getTransactionItemSubtotal(
  item: Transaction["items"][number],
): number {
  return item.quantity * item.unitPrice;
}

export function summarizeCashByType(transactions: Transaction[]): {
  retailCash: number;
  serviceCash: number;
  servicePartnerCost: number;
  serviceSparepartCost: number;
  serviceNetProfit: number;
} {
  let retailCash = 0;
  let serviceCash = 0;
  let servicePartnerCost = 0;
  let serviceSparepartCost = 0;
  let serviceNetProfit = 0;

  for (const tx of transactions) {
    const type = getTransactionType(tx);
    if (type === "SERVICE") {
      serviceCash += tx.totalHarga;
      servicePartnerCost += tx.servicePartnerFee ?? 0;
      serviceSparepartCost += tx.serviceSparepartCost ?? 0;
      serviceNetProfit +=
        tx.serviceNetProfit ??
        tx.totalHarga -
          (tx.servicePartnerFee ?? 0) -
          (tx.serviceSparepartCost ?? 0);
    } else {
      // Uang masuk ke laci = nominalBayar (bukan totalHarga untuk tempo)
      retailCash += tx.nominalBayar;
    }
  }

  return {
    retailCash,
    serviceCash,
    servicePartnerCost,
    serviceSparepartCost,
    serviceNetProfit,
  };
}