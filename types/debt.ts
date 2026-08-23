/** Catatan pembayaran cicilan / pelunasan utang */
export interface DebtPaymentLog {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export type DebtStatus = "UNPAID" | "PARTIAL" | "PAID";

/** Utang / piutang pelanggan dari transaksi tempo */
export interface Debt {
  id: string;
  transactionId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: DebtStatus;
  paymentHistory: DebtPaymentLog[];
  createdAt: string;
}

export type DebtInput = Omit<
  Debt,
  "id" | "paidAmount" | "remainingAmount" | "status" | "paymentHistory"
> & {
  paidAmount?: number;
};
