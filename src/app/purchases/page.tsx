"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/src/context/AppContext";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import type { Product } from "@/types/product";
import type {
  Purchase,
  PurchaseItem,
  PurchaseItemInput,
  PurchaseStatus,
} from "@/types/purchase";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateDefaultInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KUL-${y}${m}${d}-${rand}`;
}

function calculateSimulatedWac(
  currentStock: number,
  currentCost: number,
  qty: number,
  purchasePrice: number,
): number {
  if (qty <= 0) return currentCost;
  if (currentStock <= 0) return purchasePrice;
  const totalQty = currentStock + qty;
  const totalVal = currentStock * currentCost + qty * purchasePrice;
  return Math.round(totalVal / totalQty);
}

export default function PurchasesPage() {
  const {
    products,
    purchases,
    purchasesLoading,
    purchasesError,
    recordPurchase,
    cancelPurchase,
  } = useApp();

  // Tab State: "history" | "new"
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");

  // History Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PurchaseStatus>("ALL");

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(generateDefaultInvoiceNumber);
  const [purchaseDate, setPurchaseDate] = useState(getTodayString);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemInput[]>([]);

  // Product Selection & Scanner State
  const [productSearch, setProductSearch] = useState("");
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Detail & Void Modal State
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [voidingPurchase, setVoidingPurchase] = useState<Purchase | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Product Lookup Map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Filtered Purchases History
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchInv = (p.invoiceNumber ?? "").toLowerCase().includes(q);
      const matchSup = (p.supplierName ?? "").toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q) ?? false;
      return matchInv || matchSup || matchNotes;
    });
  }, [purchases, statusFilter, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalPurchasesAmount = 0;
    let completedCount = 0;
    let voidCount = 0;
    let totalUnits = 0;

    for (const p of purchases) {
      if (p.status === "completed") {
        totalPurchasesAmount += p.totalAmount;
        completedCount++;
        if (p.items) {
          for (const item of p.items) {
            totalUnits += item.quantity;
          }
        }
      } else if (p.status === "void") {
        voidCount++;
      }
    }

    return {
      totalPurchasesAmount,
      completedCount,
      voidCount,
      totalUnits,
      totalTransactions: purchases.length,
    };
  }, [purchases]);

  // Filtered Products for Add Item Picker
  const selectableProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase().trim();
    return products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const barcodeMatch = p.barcode?.toLowerCase().includes(q) ?? false;
        const serialMatch = p.serialNumber?.toLowerCase().includes(q) ?? false;
        const categoryMatch = p.category.toLowerCase().includes(q);
        return nameMatch || barcodeMatch || serialMatch || categoryMatch;
      })
      .slice(0, 30);
  }, [products, productSearch]);

  // Add product to purchase form items
  function addProductToForm(product: Product) {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        // Increment quantity if already added
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + 1;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.purchasePrice,
        };
        return updated;
      }

      // Add new row with current purchasePrice and sellingPrice
      const initialPrice = product.purchasePrice || 0;
      const initialQty = 1;
      const newItem: PurchaseItemInput = {
        productId: product.id,
        productName: product.name,
        quantity: initialQty,
        purchasePrice: initialPrice,
        subtotal: initialQty * initialPrice,
        updateSellingPrice: false,
        newSellingPrice: product.sellingPrice || 0,
      };
      return [...prev, newItem];
    });

    setFormError(null);
    setProductSearch("");
    setIsProductPickerOpen(false);
  }

  // Handle scanned barcode in product picker
  function handleBarcodeScanned(barcode: string) {
    const trimmed = barcode.trim();
    const found = products.find(
      (p) =>
        p.barcode?.toLowerCase() === trimmed.toLowerCase() ||
        p.serialNumber?.toLowerCase() === trimmed.toLowerCase() ||
        p.id.toLowerCase() === trimmed.toLowerCase(),
    );

    if (found) {
      addProductToForm(found);
      setSuccessToast(`Produk "${found.name}" berhasil ditambahkan.`);
      setTimeout(() => setSuccessToast(null), 3000);
    } else {
      setProductSearch(trimmed);
      setIsProductPickerOpen(true);
      window.alert(`Produk dengan barcode "${trimmed}" tidak ditemukan.`);
    }
  }

  // Update item row in purchase form
  function updateItemRow(index: number, updates: Partial<PurchaseItemInput>) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const merged = { ...current, ...updates };

      // Recalculate subtotal
      merged.subtotal = merged.quantity * merged.purchasePrice;
      next[index] = merged;
      return next;
    });
  }

  // Remove item row from purchase form
  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Calculate form totals
  const formTotalQuantity = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  }, [items]);

  const formTotalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [items]);

  // Reset form
  function resetForm() {
    setSupplierName("");
    setInvoiceNumber(generateDefaultInvoiceNumber());
    setPurchaseDate(getTodayString());
    setNotes("");
    setItems([]);
    setFormError(null);
  }

  // Submit Purchase Transaction
  async function handleSubmitPurchase(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!supplierName.trim()) {
      setFormError("Nama supplier atau toko asal wajib diisi.");
      return;
    }

    if (!invoiceNumber.trim()) {
      setFormError("Nomor faktur / bukti pembelian wajib diisi.");
      return;
    }

    if (items.length === 0) {
      setFormError("Daftar barang pembelian masih kosong. Tambahkan minimal 1 produk.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.quantity <= 0) {
        setFormError(`Jumlah unit untuk "${it.productName}" harus lebih dari 0.`);
        return;
      }
      if (it.purchasePrice < 0) {
        setFormError(`Harga beli satuan untuk "${it.productName}" tidak boleh negatif.`);
        return;
      }
      if (it.updateSellingPrice && (it.newSellingPrice === undefined || it.newSellingPrice < 0)) {
        setFormError(`Harga jual baru untuk "${it.productName}" tidak valid.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const created = await recordPurchase({
        supplierName: supplierName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        purchaseDate,
        totalAmount: formTotalAmount,
        notes: notes.trim() || undefined,
        items,
      });

      setSuccessToast(
        `Pembelian faktur ${invoiceNumber} berhasil disimpan! Stok dan harga modal produk telah diperbarui.`,
      );
      resetForm();
      setActiveTab("history");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan pembelian.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Void Purchase
  async function handleConfirmVoid() {
    if (!voidingPurchase) return;

    setIsVoiding(true);
    setVoidError(null);
    try {
      await cancelPurchase(voidingPurchase.id, voidReason.trim() || undefined);
      setSuccessToast(
        `Pembelian ${voidingPurchase.invoiceNumber} berhasil dibatalkan (void). Stok produk ditarik kembali.`,
      );
      setVoidingPurchase(null);
      setVoidReason("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membatalkan pembelian.";
      setVoidError(msg);
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl animate-fade-in">
          <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pembelian & Kulakan Barang
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              WAC & Stok Masuk
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Catat transaksi kulakan, perbarui harga modal rata-rata tertimbang (Weighted Average Cost),
            dan pantau mutasi stok masuk secara akurat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/produk"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Katalog Produk
          </Link>
          <button
            type="button"
            onClick={() => {
              if (activeTab === "history") {
                setActiveTab("new");
              } else {
                setActiveTab("history");
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            {activeTab === "history" ? (
              <>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                + Input Kulakan Baru
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Lihat Riwayat Pembelian
              </>
            )}
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Belanja Kulakan</p>
          <p className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
            {formatRupiah(stats.totalPurchasesAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Total pengeluaran stok aktif</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Transaksi</p>
          <p className="mt-1.5 text-lg font-bold tracking-tight text-indigo-600 sm:text-2xl">
            {stats.completedCount} <span className="text-xs font-normal text-slate-400">faktur</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">{stats.totalTransactions} total termasuk void</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Barang Masuk (Unit)</p>
          <p className="mt-1.5 text-lg font-bold tracking-tight text-emerald-600 sm:text-2xl">
            {stats.totalUnits.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-normal text-slate-400">item</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Total volume stok masuk</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Faktur Dibatalkan (Void)</p>
          <p className="mt-1.5 text-lg font-bold tracking-tight text-rose-600 sm:text-2xl">
            {stats.voidCount} <span className="text-xs font-normal text-slate-400">faktur</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">Stok ditarik kembali</p>
        </div>
      </section>

      {/* Tabs Control */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`border-b-2 py-3 px-1 text-sm font-semibold transition ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            Riwayat Pembelian & Faktur ({purchases.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`border-b-2 py-3 px-1 text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "new"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <span>+ Form Input Pembelian Baru</span>
            {items.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {items.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* TAB 1: RIWAYAT PEMBELIAN */}
      {activeTab === "history" && (
        <section className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari berdasarkan No. Faktur, Nama Supplier, atau Catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["ALL", "completed", "void"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      statusFilter === st
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st === "ALL" ? "Semua" : st === "completed" ? "Selesai" : "Batal (Void)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {purchasesLoading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                <svg className="mx-auto h-8 w-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="mt-2 font-medium">Memuat data riwayat pembelian...</p>
              </div>
            ) : purchasesError ? (
              <div className="p-8 text-center text-sm text-rose-600">
                <p className="font-semibold">Terjadi Kesalahan</p>
                <p className="mt-1">{purchasesError}</p>
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-3 text-sm font-semibold text-slate-800">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Tidak ada transaksi yang cocok dengan filter"
                    : "Belum ada riwayat pembelian / kulakan"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Klik tombol "+ Input Kulakan Baru" untuk mencatat faktur pembelian pertama Anda.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Tanggal & Faktur</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Item Masuk</th>
                      <th className="py-3 px-4 text-right">Total Belanja</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases.map((p) => {
                      const itemCount = p.items?.length ?? 0;
                      const totalQty = p.items?.reduce((sum, it) => sum + it.quantity, 0) ?? 0;
                      const isVoid = p.status === "void";

                      return (
                        <tr key={p.id} className="transition hover:bg-slate-50/70">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{p.invoiceNumber}</div>
                            <div className="text-xs text-slate-400">{formatDate(p.purchaseDate)}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {p.supplierName}
                            {p.notes && (
                              <p className="text-xs text-slate-400 line-clamp-1 italic">{p.notes}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <span className="font-semibold text-slate-800">{totalQty} unit</span>
                            <span className="text-slate-400"> ({itemCount} jenis)</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {formatRupiah(p.totalAmount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isVoid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                Batal (Void)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedPurchase(p)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                              >
                                Detail
                              </button>
                              {!isVoid && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoidingPurchase(p);
                                    setVoidReason("");
                                    setVoidError(null);
                                  }}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
                                >
                                  Void
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: FORM INPUT PEMBELIAN BARU */}
      {activeTab === "new" && (
        <form onSubmit={handleSubmitPurchase} className="space-y-6">
          {formError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-center gap-2 font-semibold">
                <svg className="h-5 w-5 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                Perhatian:
              </div>
              <p className="mt-1 pl-7">{formError}</p>
            </div>
          )}

          {/* Form Header Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                1
              </span>
              Informasi Faktur & Supplier
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Nama Supplier / Toko Asal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CV Bintang Distribusi, Toko Grosir Jaya"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Nomor Faktur / Bukti <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: INV-SUP-2026-001"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Tanggal Pembelian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Catatan Pembelian (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Termasuk diskon promo, garansi toko 1 tahun, pengiriman via kurir"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Form Items List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  2
                </span>
                Daftar Barang yang Dibeli ({items.length} item)
              </h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan Kamera
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProductPickerOpen(true);
                    setProductSearch("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  + Tambah Produk
                </button>
              </div>
            </div>

            {/* Empty State */}
            {items.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Belum ada barang di daftar pembelian ini
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Klik tombol <strong>+ Tambah Produk</strong> atau gunakan <strong>Scan Kamera</strong> untuk memilih barang dari katalog master.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700">
                    <tr>
                      <th className="py-3 px-3">Produk & Info</th>
                      <th className="py-3 px-3 text-center">Stok & Modal Lama</th>
                      <th className="py-3 px-3 text-center w-28">Qty Beli</th>
                      <th className="py-3 px-3 text-right w-36">Harga Beli (Satuan)</th>
                      <th className="py-3 px-3 text-right">Subtotal</th>
                      <th className="py-3 px-3 text-center">Simulasi Modal Baru</th>
                      <th className="py-3 px-3 text-center">Update Harga Jual?</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => {
                      const prod = productMap.get(it.productId);
                      const currentStock = prod?.stock ?? 0;
                      const currentCost = prod?.purchasePrice ?? 0;
                      const simulatedWac = calculateSimulatedWac(
                        currentStock,
                        currentCost,
                        it.quantity,
                        it.purchasePrice,
                      );

                      return (
                        <tr key={it.productId} className="hover:bg-slate-50/50">
                          {/* Nama Produk */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{it.productName}</div>
                            <div className="text-xs text-slate-400">
                              {prod?.barcode ? `Barcode: ${prod.barcode}` : `ID: ${it.productId}`}
                            </div>
                          </td>

                          {/* Info Stok & Modal Saat Ini */}
                          <td className="py-3 px-3 text-center text-xs">
                            <div className="text-slate-700">
                              Stok: <strong className="text-slate-900">{currentStock}</strong> unit
                            </div>
                            <div className="text-slate-500">
                              Modal: <strong>{formatRupiah(currentCost)}</strong>
                            </div>
                          </td>

                          {/* Qty Beli */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) =>
                                updateItemRow(idx, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                            />
                          </td>

                          {/* Harga Beli Satuan */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={it.purchasePrice}
                              onChange={(e) =>
                                updateItemRow(idx, {
                                  purchasePrice: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                            />
                          </td>

                          {/* Subtotal */}
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatRupiah(it.subtotal ?? it.quantity * it.purchasePrice)}
                          </td>

                          {/* Simulasi Modal Baru (WAC) */}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block rounded-lg bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
                              {formatRupiah(simulatedWac)}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Stok jadi: {currentStock + it.quantity}
                            </div>
                          </td>

                          {/* Update Harga Jual Checkbox & Input */}
                          <td className="py-3 px-3 text-center">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={it.updateSellingPrice}
                                onChange={(e) =>
                                  updateItemRow(idx, {
                                    updateSellingPrice: e.target.checked,
                                    newSellingPrice:
                                      it.newSellingPrice || (prod?.sellingPrice ?? 0),
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-xs text-slate-700">Ya</span>
                            </label>

                            {it.updateSellingPrice && (
                              <div className="mt-1">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Harga Jual Baru"
                                  value={it.newSellingPrice ?? prod?.sellingPrice ?? 0}
                                  onChange={(e) =>
                                    updateItemRow(idx, {
                                      newSellingPrice: Math.max(0, parseInt(e.target.value) || 0),
                                    })
                                  }
                                  className="w-28 rounded-lg border border-emerald-300 bg-emerald-50/50 px-2 py-1 text-right text-xs font-semibold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            )}
                          </td>

                          {/* Aksi Hapus */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Hapus item"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Footer & Submit Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-500">Total Volume:</span>
                <p className="text-lg font-bold text-slate-800">
                  {formTotalQuantity} <span className="text-xs font-normal">unit</span>
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-xs text-slate-500">Total Nilai Pembelian:</span>
                <p className="text-2xl font-black text-indigo-600">
                  {formatRupiah(formTotalAmount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Reset Form
              </button>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Menyimpan & Menghitung WAC...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Simpan Transaksi Pembelian
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MODAL: PILIH PRODUK UNTUK DITAMBAHKAN */}
      {isProductPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pilih Produk Kulakan</h3>
                <p className="text-xs text-slate-500">
                  Cari berdasarkan nama barang, kode SKU, atau barcode.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductPickerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <input
                type="text"
                autoFocus
                placeholder="Ketik nama produk atau barcode..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
              {selectableProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Tidak ada produk yang cocok dengan pencarian "{productSearch}".
                </div>
              ) : (
                selectableProducts.map((p) => {
                  const isAlreadyAdded = items.some((it) => it.productId === p.id);
                  return (
                    <div
                      key={p.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl px-2 transition"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Stok: <strong>{p.stock}</strong></span>
                          <span>&bull;</span>
                          <span>Modal: <strong>{formatRupiah(p.purchasePrice)}</strong></span>
                          {p.barcode && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-500">[{p.barcode}]</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addProductToForm(p)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          isAlreadyAdded
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-indigo-600 text-white hover:bg-indigo-500"
                        }`}
                      >
                        {isAlreadyAdded ? "+ Tambah Lagi" : "Pilih"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsProductPickerOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL PEMBELIAN */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Faktur: {selectedPurchase.invoiceNumber}
                  </h3>
                  {selectedPurchase.status === "void" ? (
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                      Batal (Void)
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      Selesai
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Supplier: <strong>{selectedPurchase.supplierName}</strong> &bull; Tanggal:{" "}
                  {formatDate(selectedPurchase.purchaseDate)}
                </p>
                {selectedPurchase.notes && (
                  <p className="text-xs text-slate-600 mt-1 italic">
                    Catatan: {selectedPurchase.notes}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Rincian Barang yang Dibeli
              </h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Produk</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Harga Beli</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-center">Update Jual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right">{formatRupiah(it.purchasePrice)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatRupiah(it.subtotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {it.updateSellingPrice ? (
                            <span className="text-emerald-700 font-semibold">
                              Ya ({it.newSellingPrice ? formatRupiah(it.newSellingPrice) : "-"})
                            </span>
                          ) : (
                            <span className="text-slate-400">Tidak</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Total Keseluruhan:</span>
                <span className="text-lg font-black text-indigo-700">
                  {formatRupiah(selectedPurchase.totalAmount)}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                Dibuat pada: {formatDate(selectedPurchase.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI BATALKAN (VOID) PEMBELIAN */}
      {voidingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Batalkan Pembelian (Void)?
                </h3>
                <p className="text-xs text-slate-500">
                  Faktur: {voidingPurchase.invoiceNumber}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Peringatan Penting:</strong>
              <p className="mt-1">
                Membatalkan pembelian ini akan <strong>mengurangi stok produk</strong> di toko
                sesuai jumlah yang pernah dibeli. Jika stok barang saat ini di toko sudah berkurang
                karena transaksi penjualan, pembatalan akan <strong>ditolak oleh sistem</strong>.
              </p>
            </div>

            {voidError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <strong>Gagal:</strong> {voidError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700">
                Alasan Pembatalan (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Salah input faktur, barang diretur ke supplier"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isVoiding}
                onClick={() => {
                  setVoidingPurchase(null);
                  setVoidError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleConfirmVoid}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
              >
                {isVoiding ? "Memproses Void..." : "Ya, Batalkan Pembelian"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Pindai Barcode Produk Kulakan"
        description="Arahkan kamera HP ke barcode kemasan barang untuk menambahkan ke daftar pembelian"
      />
    </div>
  );
}

