import type { PaymentMethod } from "./transaction";

/** Metode pembayaran pelunasan utang (tanpa CREDIT) */
export type DebtSettlementMethod = Exclude<PaymentMethod, "CREDIT">;

/** Data struk bukti pembayaran utang di Kasir */
export interface DebtPaymentReceipt {
  id: string;
  timestamp: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentAmount: number;
  paymentMethod: DebtSettlementMethod;
  note?: string;
  /** Sisa utang pelanggan setelah pembayaran ini */
  remainingAfter: number;
  /** ID utang yang ikut terpotong */
  debtIds: string[];
}
