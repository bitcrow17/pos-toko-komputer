import { supabase } from "@/src/lib/supabase";
import {
  mapDbCustomer,
  mapDbPartner,
  mapDbProduct,
  mapDbPurchase,
  mapDbPurchaseItem,
  mapDbService,
  mapDbStockMutation,
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
  Purchase,
  PurchaseInput,
  PurchaseItem,
  StockMutation,
} from "@/types/purchase";
import type {
  DbCustomer,
  DbPartner,
  DbProduct,
  DbPurchase,
  DbPurchaseItem,
  DbService,
  DbStockMutation,
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
    .or(`name.ilike.${pattern},barcode.ilike.${pattern},category.ilike.${pattern}`)
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

export async function getNextServiceTicketNo(): Promise<string> {
  // Build today's date prefix: YYYYMMDD (local time)
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `SVC-${yyyy}${mm}${dd}`;

  // Query only today's tickets to find the max sequence for today
  const { data, error } = await supabase
    .from("services")
    .select("ticket_no")
    .like("ticket_no", `${datePrefix}-%`);

  if (error) {
    console.warn(
      "getNextServiceTicketNo: query failed, using fallback seq=1",
      error.message,
    );
  }

  let maxSeq = 0;
  if (data && data.length > 0) {
    for (const row of data) {
      const tn = row.ticket_no as string | null;
      const match = tn?.match(/^SVC-\d{8}-(\d+)$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${datePrefix}-${String(nextSeq).padStart(3, "0")}`;
}

// ==============================================================================
// MODUL PEMBELIAN / KULAKAN (PURCHASES) & MUTASI STOK
// ==============================================================================

type DbPurchaseWithItems = DbPurchase & {
  purchase_items?: DbPurchaseItem[] | null;
};

/** Generate nomor ID transaksi pembelian format PUR-YYYYMMDD-001 */
export async function generatePurchaseIdFromDb(): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `PUR-${yyyy}${mm}${dd}`;

  try {
    const { data, error } = await supabase
      .from("purchases")
      .select("id")
      .like("id", `${datePrefix}-%`);

    if (error) {
      console.warn("generatePurchaseIdFromDb: query failed, using timestamp fallback", error.message);
      return `${datePrefix}-${Date.now().toString().slice(-4)}`;
    }

    let maxSeq = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        const id = row.id as string | null;
        const match = id?.match(/^PUR-\d{8}-(\d+)$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${datePrefix}-${String(nextSeq).padStart(3, "0")}`;
  } catch {
    return `${datePrefix}-${Date.now().toString().slice(-4)}`;
  }
}

/** Ambil seluruh data pembelian beserta item barang */
export async function fetchPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(*)")
    .order("created_at", { ascending: false });

  throwIfError(error, "Gagal memuat riwayat pembelian");

  return ((data as DbPurchaseWithItems[]) ?? []).map((row) => {
    const items = (row.purchase_items ?? []).map(mapDbPurchaseItem);
    return mapDbPurchase(row, items);
  });
}

/** Ambil 1 data pembelian berdasarkan ID */
export async function fetchPurchaseById(id: string): Promise<Purchase | null> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  const row = data as DbPurchaseWithItems;
  const items = (row.purchase_items ?? []).map(mapDbPurchaseItem);
  return mapDbPurchase(row, items);
}

/** Simpan transaksi pembelian baru secara atomik (via RPC Supabase) */
export async function createPurchaseTransaction(
  input: PurchaseInput,
): Promise<{ success: boolean; purchaseId: string; message: string }> {
  if (!input.items || input.items.length === 0) {
    throw new Error("Daftar barang pembelian tidak boleh kosong.");
  }

  const purchaseId = input.id || (await generatePurchaseIdFromDb());
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity * item.purchasePrice,
    0,
  );
  const totalItems = input.items.reduce((sum, item) => sum + item.quantity, 0);

  // Format payload item untuk RPC
  const itemsPayload = input.items.map((item) => ({
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    purchase_price: item.purchasePrice,
    update_selling_price: Boolean(item.updateSellingPrice),
    new_selling_price: item.updateSellingPrice ? (item.newSellingPrice ?? null) : null,
  }));

  // Panggil RPC atomik di Supabase
  const { data, error } = await supabase.rpc("create_purchase_transaction", {
    p_purchase_id: purchaseId,
    p_invoice_number: input.invoiceNumber?.trim() || null,
    p_supplier_name: input.supplierName?.trim() || null,
    p_purchase_date: input.purchaseDate || new Date().toISOString().split("T")[0],
    p_total_amount: totalAmount,
    p_total_items: totalItems,
    p_notes: input.notes?.trim() || null,
    p_created_by: input.createdBy?.trim() || "admin",
    p_items: itemsPayload,
  });

  if (error) {
    // Jika RPC belum dieksekusi di database Supabase user (misal function 42883 not found), fallback aman
    if (error.code === "42883" || error.message.includes("does not exist")) {
      console.warn("RPC create_purchase_transaction belum ada di database, menjalankan fallback client-side...");
      return await clientSideCreatePurchaseFallback(purchaseId, input, totalAmount, totalItems);
    }
    throw new Error(`Gagal menyimpan pembelian: ${error.message}`);
  }

  const res = data as { success?: boolean; purchase_id?: string; message?: string } | null;
  return {
    success: true,
    purchaseId: res?.purchase_id || purchaseId,
    message: res?.message || "Transaksi pembelian berhasil disimpan",
  };
}

/** Batalkan (void) transaksi pembelian secara atomik */
export async function voidPurchaseTransaction(
  purchaseId: string,
  voidReason?: string,
  voidedBy?: string,
): Promise<{ success: boolean; purchaseId: string; message: string }> {
  const { data, error } = await supabase.rpc("void_purchase_transaction", {
    p_purchase_id: purchaseId,
    p_void_reason: voidReason?.trim() || "Dibatalkan oleh pengguna",
    p_voided_by: voidedBy?.trim() || "admin",
  });

  if (error) {
    if (error.code === "42883" || error.message.includes("does not exist")) {
      console.warn("RPC void_purchase_transaction belum ada di database, menjalankan fallback client-side...");
      return await clientSideVoidPurchaseFallback(purchaseId, voidReason, voidedBy);
    }
    // Pesan error dari RAISE EXCEPTION PostgreSQL (misal stok tidak mencukupi)
    throw new Error(error.message);
  }

  const res = data as { success?: boolean; purchase_id?: string; message?: string } | null;
  return {
    success: true,
    purchaseId: res?.purchase_id || purchaseId,
    message: res?.message || "Pembelian berhasil dibatalkan (void)",
  };
}

/** Ambil riwayat mutasi stok */
export async function fetchStockMutations(
  productId?: string,
): Promise<StockMutation[]> {
  let query = supabase
    .from("stock_mutations")
    .select("*")
    .order("created_at", { ascending: false });

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query.limit(100);
  throwIfError(error, "Gagal memuat log mutasi stok");

  return ((data as DbStockMutation[]) ?? []).map(mapDbStockMutation);
}

// Fallback jika database belum menjalankan SQL RPC
async function clientSideCreatePurchaseFallback(
  purchaseId: string,
  input: PurchaseInput,
  totalAmount: number,
  totalItems: number,
) {
  const now = new Date().toISOString();
  const purchaseDate = input.purchaseDate || now.split("T")[0];

  // 1. Simpan header
  const { error: headerErr } = await supabase.from("purchases").insert({
    id: purchaseId,
    invoice_number: input.invoiceNumber?.trim() || null,
    supplier_name: input.supplierName?.trim() || null,
    purchase_date: purchaseDate,
    total_amount: totalAmount,
    total_items: totalItems,
    notes: input.notes?.trim() || null,
    status: "completed",
    created_by: input.createdBy?.trim() || "admin",
    created_at: now,
    updated_at: now,
  });
  throwIfError(headerErr, "Gagal menyimpan header pembelian");

  // 2. Loop update item & product
  for (const item of input.items) {
    // Ambil data produk lama
    const { data: prodData, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", item.productId)
      .single();
    throwIfError(prodErr, `Produk ${item.productName} tidak ditemukan`);

    const oldStock = Number(prodData.stock) || 0;
    const oldCost = Number(prodData.purchase_price) || 0;
    const newQty = item.quantity;
    const newPrice = item.purchasePrice;

    // Weighted average
    let newAvgCost: number;
    if (oldStock <= 0) {
      newAvgCost = newPrice;
    } else {
      newAvgCost = Math.round(
        (((oldStock * oldCost) + (newQty * newPrice)) / (oldStock + newQty)) * 100,
      ) / 100;
    }

    const newStock = oldStock + newQty;

    // Update produk
    const updatePayload: Record<string, unknown> = {
      stock: newStock,
      purchase_price: newAvgCost,
    };
    if (item.updateSellingPrice && item.newSellingPrice && item.newSellingPrice > 0) {
      updatePayload.selling_price = item.newSellingPrice;
    }

    const { error: updErr } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", item.productId);
    throwIfError(updErr, `Gagal mengupdate stok & harga produk ${item.productName}`);

    // Insert purchase_item
    await supabase.from("purchase_items").insert({
      purchase_id: purchaseId,
      product_id: item.productId,
      product_name: item.productName,
      quantity: newQty,
      purchase_price: newPrice,
      subtotal: newQty * newPrice,
      update_selling_price: Boolean(item.updateSellingPrice),
      new_selling_price: item.updateSellingPrice ? (item.newSellingPrice ?? null) : null,
      prev_stock: oldStock,
      prev_purchase_price: oldCost,
      created_at: now,
    });

    // Insert mutation
    await supabase.from("stock_mutations").insert({
      product_id: item.productId,
      mutation_type: "PURCHASE",
      reference_type: "purchases",
      reference_id: purchaseId,
      quantity_change: newQty,
      stock_before: oldStock,
      stock_after: newStock,
      notes: `Pembelian No: ${purchaseId} (${input.supplierName || "Supplier"})`,
      created_at: now,
    });
  }

  return {
    success: true,
    purchaseId,
    message: "Transaksi pembelian kulakan berhasil disimpan",
  };
}

async function clientSideVoidPurchaseFallback(
  purchaseId: string,
  voidReason?: string,
  voidedBy?: string,
) {
  // 1. Ambil data purchase beserta item
  const { data: purchaseData, error: purErr } = await supabase
    .from("purchases")
    .select("*, purchase_items(*)")
    .eq("id", purchaseId)
    .single();
  throwIfError(purErr, "Pembelian tidak ditemukan");

  if (purchaseData.status === "void") {
    throw new Error(`Transaksi pembelian "${purchaseId}" sudah dibatalkan sebelumnya (sudah void)`);
  }

  const items = purchaseData.purchase_items as DbPurchaseItem[] || [];

  // 2. Validasi stok semua item terlebih dahulu
  for (const item of items) {
    const { data: prodData, error: prodErr } = await supabase
      .from("products")
      .select("id, name, stock")
      .eq("id", item.product_id)
      .single();
    throwIfError(prodErr, `Produk ${item.product_name} tidak ditemukan`);
    if (!prodData) {
      throw new Error(`Produk ${item.product_name} tidak ditemukan`);
    }

    const currentStock = Number(prodData.stock) || 0;
    if (currentStock < item.quantity) {
      throw new Error(
        `Gagal membatalkan pembelian: Stok produk "${prodData.name}" tidak mencukupi untuk dikurangi. Stok saat ini: ${currentStock}, yang harus dikurangi: ${item.quantity}`,
      );
    }
  }

  // 3. Kurangi stok dan catat mutasi
  const now = new Date().toISOString();
  for (const item of items) {
    const { data: prodData } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();

    const currentStock = Number(prodData?.stock) || 0;
    const newStock = currentStock - item.quantity;

    await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.product_id);

    await supabase.from("stock_mutations").insert({
      product_id: item.product_id,
      mutation_type: "PURCHASE_VOID",
      reference_type: "purchases",
      reference_id: purchaseId,
      quantity_change: -item.quantity,
      stock_before: currentStock,
      stock_after: newStock,
      notes: `Pembatalan (Void) Pembelian: ${purchaseId} - ${voidReason || "Dibatalkan"} (oleh ${voidedBy || "admin"})`,
      created_at: now,
    });
  }

  // 4. Update status purchase ke void
  const existingNotes = purchaseData.notes || "";
  const voidNote = `[VOID]: ${voidReason || "Dibatalkan"}`;
  const updatedNotes = existingNotes ? `${existingNotes}\n${voidNote}` : voidNote;

  await supabase
    .from("purchases")
    .update({ status: "void", notes: updatedNotes, updated_at: now })
    .eq("id", purchaseId);

  return {
    success: true,
    purchaseId,
    message: "Transaksi pembelian berhasil dibatalkan (void)",
  };
}
