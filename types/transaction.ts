/** Metode pembayaran transaksi */
export type PaymentMethod =
  | "cash" // tunai
  | "transfer" // transfer bank
  | "qris" // QRIS
  | "debit" // kartu debit
  | "credit" // kartu kredit
  | "other"; // lainnya

/** Data transaksi penjualan */
export interface Transaction {
  /** ID unik transaksi */
  id: string;
  /** Tanggal transaksi (ISO date string) */
  date: string;
  /** Total harga dalam IDR (bilangan bulat) */
  totalPrice: number;
  /** Metode pembayaran */
  paymentMethod: PaymentMethod;
}
