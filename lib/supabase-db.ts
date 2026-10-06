import { supabase } from "@/src/lib/supabase";
import {
  mapDbCustomer,
  mapDbPartner,
  mapDbProduct,
  mapDbService,
  mapDbTransaction,
  mapDbTransactionItem,
  mapCustomerToDb,
  mapDebtToDb,
  mapPartnerToDb,
  mapProductToDb,
  mapServiceToDb,
  mapTransactionItemToDb,
  mapTransactionToDb,
} from "@/lib/supabase-mappers";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type { Transaction, TransactionItem } from "@/types/transaction";
import type { Debt } from "@/types/debt";
import type { Partner, ServiceTicket } from "@/types/service";
import type {
  DbCustomer,
  DbPartner,
  DbProduct,
  DbService,
  DbTransaction,
  DbTransactionItem,
} from "@/types/supabase";
import { normalizePhone } from "@/lib/customer";

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Filter `or` PostgREST dengan nilai ilike yang di-quote agar koma/titik aman */
function orIlike(columns: string[], rawQuery: string): string {
  const pattern = `%${escapeIlike(rawQuery)}%`.replace(/"/g, '\\"');
  return columns.map((column) => `${column}.ilike."${pattern}"`).join(",");
}

/** Ambil seluruh produk dari Supabase */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  throwIfError(error, "Gagal memuat produk");
  return (data as DbProduct[]).map(mapDbProduct);
}

/** Cari produk berdasarkan nama atau barcode */
export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim();
  if (!q) return fetchProducts();

  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(`name.ilike.${pattern},barcode.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(50);

  throwIfError(error, "Gagal mencari produk");
  return (data as DbProduct[]).map(mapDbProduct);
}

/** Cari produk dengan barcode exact match */
export async function findProductByBarcode(
  barcode: string,
): Promise<Product | null> {
  const code = barcode.trim();
  if (!code) return null;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", code)
    .maybeSingle();

  throwIfError(error, "Gagal mencari barcode");
  return data ? mapDbProduct(data as DbProduct) : null;
}

export async function insertProduct(
  product: Product,
): Promise<Product> {
  const row = mapProductToDb(product);
  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("*")
    .single();

  throwIfError(error, "Gagal menyimpan produk");
  return mapDbProduct(data as DbProduct);
}

export async function updateProductInDb(
  id: string,
  updates: Omit<Product, "id">,
): Promise<Product> {
  const row = mapProductToDb({ ...updates, id });
  const { id: _id, ...payload } = row;

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "Gagal memperbarui produk");
  return mapDbProduct(data as DbProduct);
}

export async function deleteProductFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  throwIfError(error, "Gagal menghapus produk");
}

export async function deleteProductsFromDb(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("products").delete().in("id", ids);
  throwIfError(error, "Gagal menghapus produk");
}

export async function clearAllProductsFromDb(): Promise<void> {
  const { error } = await supabase
    .from("products")
    .delete()
    .neq("id", "");
  throwIfError(error, "Gagal menghapus semua produk");
}

/** Generate nomor invoice berdasarkan data di Supabase */
export async function generateInvoiceNumberFromDb(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `INV-${y}${m}${d}`;

  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .like("id", `${prefix}%`);

  throwIfError(error, "Gagal membuat nomor invoice");
  return `${prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

export interface SaveRetailTransactionPayload {
  transaction: Transaction;
  items: TransactionItem[];
  stockUpdates: { productId: string; quantity: number }[];
  debt?: Debt | null;
}

/** Simpan transaksi retail lengkap ke Supabase */
export async function saveRetailTransaction(
  payload: SaveRetailTransactionPayload,
): Promise<void> {
  const { transaction, items, stockUpdates, debt } = payload;
  const txRow = mapTransactionToDb(transaction);

  const { error: txError } = await supabase
    .from("transactions")
    .insert(txRow);

  throwIfError(txError, "Gagal menyimpan transaksi");

  if (items.length > 0) {
    const itemRows = items.map((item) =>
      mapTransactionItemToDb(transaction.id, item),
    );
    const { error: itemsError } = await supabase
      .from("transaction_items")
      .insert(itemRows);

    throwIfError(itemsError, "Gagal menyimpan rincian transaksi");
  }

  for (const update of stockUpdates) {
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", update.productId)
      .single();

    throwIfError(fetchError, `Gagal membaca stok produk ${update.productId}`);

    const currentStock = Number((product as { stock: number }).stock);
    const newStock = Math.max(0, currentStock - update.quantity);

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", update.productId);

    throwIfError(stockError, `Gagal mengurangi stok produk ${update.productId}`);
  }

  if (debt) {
    const debtRow = mapDebtToDb(debt);
    const { error: debtError } = await supabase.from("debts").insert(debtRow);
    throwIfError(debtError, "Gagal menyimpan data utang");
  }
}

/** Simpan tiket servis masuk ke Supabase */
export async function insertServiceTicket(
  ticket: ServiceTicket,
): Promise<ServiceTicket> {
  const row = mapServiceToDb(ticket);
  const { data, error } = await supabase
    .from("services")
    .insert(row)
    .select("*")
    .single();

  throwIfError(error, "Gagal menyimpan tiket servis");
  return mapDbService(data as DbService);
}

/** Ambil seluruh tiket servis dari Supabase */
export async function fetchServices(): Promise<ServiceTicket[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  throwIfError(error, "Gagal memuat tiket servis");
  return (data as DbService[]).map(mapDbService);
}

export async function updateServiceInDb(
  ticket: ServiceTicket,
): Promise<ServiceTicket> {
  const row = mapServiceToDb(ticket);
  const { id, created_at: _createdAt, ...payload } = row;

  const { data, error } = await supabase
    .from("services")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "Gagal memperbarui tiket servis");
  return mapDbService(data as DbService);
}

export async function deleteServiceFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  throwIfError(error, "Gagal menghapus tiket servis");
}

/** Ambil seluruh mitra dari Supabase */
export async function fetchPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  throwIfError(error, "Gagal memuat mitra");
  return (data as DbPartner[]).map(mapDbPartner);
}

export async function insertPartner(partner: Partner): Promise<Partner> {
  const row = mapPartnerToDb(partner);
  const { data, error } = await supabase
    .from("partners")
    .insert(row)
    .select("*")
    .single();

  throwIfError(error, "Gagal menyimpan mitra");
  return mapDbPartner(data as DbPartner);
}

export async function updatePartnerInDb(
  id: string,
  updates: Pick<Partner, "name" | "phone" | "address">,
): Promise<Partner> {
  const { data, error } = await supabase
    .from("partners")
    .update({
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
    })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "Gagal memperbarui mitra");
  return mapDbPartner(data as DbPartner);
}

export async function deletePartnerFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("partners").delete().eq("id", id);
  throwIfError(error, "Gagal menghapus mitra");
}

type DbTransactionWithItems = DbTransaction & {
  transaction_items?: DbTransactionItem[] | null;
};

/** Ambil riwayat transaksi beserta rincian barang */
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, transaction_items(*)")
    .order("timestamp", { ascending: false });

  throwIfError(error, "Gagal memuat riwayat transaksi");

  return ((data as DbTransactionWithItems[]) ?? []).map((row) => {
    const items = (row.transaction_items ?? []).map(mapDbTransactionItem);
    return mapDbTransaction(row, items);
  });
}

export async function generateServicePaymentInvoiceNumberFromDb(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `SVC-PAY-${y}${m}${d}`;

  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .like("id", `${prefix}%`);

  throwIfError(error, "Gagal membuat nomor nota servis");
  return `${prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

/** Hitung jumlah tiket servis untuk generate ticket_no */
export async function countServicesInDb(): Promise<number> {
  const { count, error } = await supabase
    .from("services")
    .select("*", { count: "exact", head: true });

  throwIfError(error, "Gagal menghitung tiket servis");
  return count ?? 0;
}

/** Ambil seluruh pelanggan dari Supabase */
export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  throwIfError(error, "Gagal memuat pelanggan");
  return (data as DbCustomer[]).map(mapDbCustomer);
}

/** Cari pelanggan berdasarkan nama atau nomor HP */
export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.trim();
  if (!q) return fetchCustomers();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(orIlike(["name", "phone"], q))
    .order("name", { ascending: true })
    .limit(20);

  throwIfError(error, "Gagal mencari pelanggan");
  return (data as DbCustomer[]).map(mapDbCustomer);
}

/** Cari pelanggan berdasarkan nomor HP (exact setelah normalisasi) */
export async function findCustomerByPhone(
  phone: string,
): Promise<Customer | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const tail = normalized.slice(-8);
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .ilike("phone", `%${escapeIlike(tail)}%`)
    .limit(50);

  throwIfError(error, "Gagal mencari pelanggan");

  const match = (data as DbCustomer[]).find(
    (row) => normalizePhone(row.phone) === normalized,
  );
  return match ? mapDbCustomer(match) : null;
}

export async function insertCustomer(customer: Customer): Promise<Customer> {
  const row = mapCustomerToDb(customer);
  const { data, error } = await supabase
    .from("customers")
    .insert(row)
    .select("*")
    .single();

  throwIfError(error, "Gagal menyimpan pelanggan");
  return mapDbCustomer(data as DbCustomer);
}

export async function updateCustomerInDb(
  id: string,
  updates: Pick<Customer, "name" | "phone" | "address">,
): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .update({
      name: updates.name,
      phone: updates.phone,
      address: updates.address ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "Gagal memperbarui pelanggan");
  return mapDbCustomer(data as DbCustomer);
}

export async function deleteCustomerFromDb(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  throwIfError(error, "Gagal menghapus pelanggan");
}

export interface UpsertCustomerParams {
  name: string;
  phone: string;
  address?: string;
}

/**
 * Simpan atau perbarui pelanggan berdasarkan nomor HP.
 * Jika nomor HP sudah ada, perbarui nama/alamat. Jika belum, buat baru.
 */
export async function upsertCustomerByContact(
  params: UpsertCustomerParams,
): Promise<Customer> {
  const name = params.name.trim();
  const rawPhone = params.phone.trim();
  if (!name || !rawPhone) {
    throw new Error("Nama dan nomor HP pelanggan wajib diisi.");
  }

  // Simpan format normalisasi agar dedupe nomor HP konsisten
  const phone = normalizePhone(rawPhone) || rawPhone;
  const address = params.address?.trim() || undefined;
  const now = new Date().toISOString();

  const existingByPhone = await findCustomerByPhone(phone);
  if (existingByPhone) {
    const needsUpdate =
      existingByPhone.name !== name ||
      existingByPhone.phone !== phone ||
      (address !== undefined && existingByPhone.address !== address);
    if (needsUpdate) {
      return updateCustomerInDb(existingByPhone.id, {
        name,
        phone,
        address: address ?? existingByPhone.address,
      });
    }
    return existingByPhone;
  }

  const id = `CUS-${Date.now()}`;
  return insertCustomer({
    id,
    code: id.startsWith("CUS-") ? `PLG-${id.slice(4)}` : id,
    name,
    phone,
    address,
    type: "REGULAR",
    createdAt: now,
  });
}
