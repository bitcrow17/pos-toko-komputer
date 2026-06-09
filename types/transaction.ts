/** Baris item dalam transaksi yang sudah lunas */
export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

/** Transaksi penjualan yang sudah sukses / lunas */
export interface Transaction {
  /** Nomor nota, misal: INV-20241103-001 */
  id: string;
  /** Tanggal & waktu transaksi (ISO string) */
  timestamp: string;
  items: TransactionItem[];
  totalHarga: number;
  nominalBayar: number;
  kembalian: number;
}
