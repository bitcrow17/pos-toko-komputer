import type { ProductCategory } from "@/types/product";
import type { PaymentMethod, TransactionType } from "@/types/transaction";
import type { DebtStatus } from "@/types/debt";
import type {
  HandlingType,
  PartnerStatus,
  ServiceAccessory,
  ServiceStatus,
} from "@/types/service";

/** Baris tabel `customers` di Supabase (snake_case) */
export interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  created_at?: string;
}

/** Baris tabel `products` di Supabase (snake_case) */
export interface DbProduct {
  id: string;
  name: string;
  category: ProductCategory;
  purchase_price: number;
  selling_price: number;
  stock: number;
  serial_number?: string | null;
  barcode?: string | null;
  minimum_stock?: number | null;
  created_at?: string;
}

/** Baris tabel `transactions` */
export interface DbTransaction {
  id: string;
  timestamp: string;
  type?: TransactionType | null;
  total_harga: number;
  nominal_bayar: number;
  kembalian: number;
  payment_method?: PaymentMethod | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  debt_id?: string | null;
  service_ticket_id?: string | null;
  service_ticket_no?: string | null;
  service_partner_fee?: number | null;
  service_sparepart_cost?: number | null;
  service_net_profit?: number | null;
}

/** Baris tabel `transaction_items` */
export interface DbTransactionItem {
  id?: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

/** Baris tabel `debts` */
export interface DbDebt {
  id: string;
  transaction_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: DebtStatus;
  payment_history?: unknown;
  created_at: string;
}

/** Baris tabel `partners` */
export interface DbPartner {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at?: string;
}

/** Baris tabel `services` */
export interface DbService {
  id: string;
  ticket_no: string;
  customer_name: string;
  customer_phone: string;
  device_name: string;
  serial_number?: string | null;
  problem: string;
  work_notes?: string | null;
  handling_type: HandlingType;
  partner_id?: string | null;
  partner_status?: PartnerStatus | null;
  partner_fee: number;
  customer_fee: number;
  is_complaint: boolean;
  original_ticket_no?: string | null;
  accessories?: ServiceAccessory[] | null;
  estimated_completion_date?: string | null;
  sparepart_cost?: number | null;
  net_profit?: number | null;
  is_paid?: boolean | null;
  payment_transaction_id?: string | null;
  collected_at?: string | null;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
}

/** Baris tabel `purchases` di Supabase */
export interface DbPurchase {
  id: string;
  invoice_number?: string | null;
  supplier_name?: string | null;
  purchase_date: string;
  total_amount: number;
  total_items: number;
  notes?: string | null;
  status: "completed" | "void";
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Baris tabel `purchase_items` di Supabase */
export interface DbPurchaseItem {
  id?: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  purchase_price: number;
  subtotal: number;
  update_selling_price: boolean;
  new_selling_price?: number | null;
  prev_stock?: number;
  prev_purchase_price?: number;
  created_at?: string;
}

/** Baris tabel `stock_mutations` di Supabase */
export interface DbStockMutation {
  id?: string;
  product_id: string;
  mutation_type: string;
  reference_type: string;
  reference_id: string;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  notes?: string | null;
  created_at?: string;
}
