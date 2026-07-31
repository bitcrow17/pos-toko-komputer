"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/src/context/AppContext";
import {
  formatCodeOrSerial,
  generateRandomBarcode,
  inferHasFactorySerial,
  resolveSerialOrCode,
} from "@/lib/admin-product";
import {
  buildProductExportCsv,
  buildProductTemplateCsv,
  downloadCsvFile,
  getProductExportFilename,
  parseImportedProducts,
} from "@/lib/product-csv";
import type { Product, ProductCategory } from "@/types/product";

const CATEGORIES: ProductCategory[] = [
  "laptop",
  "desktop",
  "monitor",
  "keyboard",
  "mouse",
  "storage",
  "ram",
  "gpu",
  "cpu",
  "accessory",
  "other",
];

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  laptop: "Laptop",
  desktop: "Desktop",
  monitor: "Monitor",
  keyboard: "Keyboard",
  mouse: "Mouse",
  storage: "Storage",
  ram: "RAM",
  gpu: "GPU",
  cpu: "CPU",
  accessory: "Aksesoris",
  other: "Lainnya",
};

const LOW_STOCK_THRESHOLD = 5;
const HIGH_STOCK_THRESHOLD = 20;

const EMPTY_FORM = {
  name: "",
  category: "other" as ProductCategory,
  stock: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  barcode: "",
  hasSerialNumber: false,
  serialNumberInput: "",
};

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

type SortField = "name" | "stock" | "price" | "modal";
type SortOrder = "asc" | "desc";

function compareProducts(
  a: Product,
  b: Product,
  field: SortField,
  order: SortOrder,
): number {
  let result = 0;
  switch (field) {
    case "name":
      result = a.name.localeCompare(b.name, "id-ID");
      break;
    case "stock":
      result = a.stock - b.stock;
      break;
    case "price":
      result = a.sellingPrice - b.sellingPrice;
      break;
    case "modal":
      result = a.purchasePrice - b.purchasePrice;
      break;
  }
  return order === "asc" ? result : -result;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="m2.695 14.363 1.092-3.155 9.607-9.607a1.875 1.875 0 0 1 2.652 0l1.092 1.092a1.875 1.875 0 0 1 0 2.652l-9.607 9.607-3.155 1.092a.375.375 0 0 1-.476-.476Z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function SortIndicator({
  active,
  order,
}: {
  active: boolean;
  order: SortOrder;
}) {
  if (!active) {
    return (
      <span className="ml-1 inline-block text-[10px] text-slate-300" aria-hidden>
        ↕
      </span>
    );
  }

  return (
    <span className="ml-1 inline-block text-indigo-600" aria-hidden>
      {order === "asc" ? "▲" : "▼"}
    </span>
  );
}

function SortableHeader({
  field,
  label,
  align = "left",
  sortField,
  sortOrder,
  onSort,
}: {
  field: SortField;
  label: string;
  align?: "left" | "center" | "right";
  sortField: SortField | null;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  const alignClass =
    align === "center"
      ? "justify-center"
      : align === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <th className="px-6 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Urutkan berdasarkan ${label}`}
        aria-pressed={active}
        className={`inline-flex w-full items-center gap-0.5 text-xs font-semibold uppercase tracking-wide transition ${alignClass} ${
          active
            ? "text-indigo-600"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {label}
        <SortIndicator active={active} order={sortOrder} />
      </button>
    </th>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-red-700">
        {stock}
      </span>
    );
  }

  if (stock >= HIGH_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700">
        {stock}
      </span>
    );
  }

  return (
    <span className="tabular-nums font-medium text-slate-700">{stock}</span>
  );
}

export default function AdminProdukPage() {
  const {
    products,
    addProduct,
    importProducts,
    updateProduct,
    deleteProduct,
    deleteMultipleProducts,
    clearAllProducts,
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    ProductCategory | "all"
  >("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const isEditMode = editingId !== null;

  const stats = useMemo(
    () => ({
      totalProducts: products.length,
      totalStockItems: products.reduce((sum, p) => sum + p.stock, 0),
      lowStockCount: products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .length,
    }),
    [products],
  );

  const searchedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const code = formatCodeOrSerial(product).toLowerCase();
      return (
        product.name.toLowerCase().includes(q) ||
        product.id.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.barcode?.toLowerCase().includes(q) ?? false) ||
        code.includes(q)
      );
    });
  }, [products, searchQuery, categoryFilter]);

  const lowStockFilteredProducts = useMemo(() => {
    if (!filterLowStock) return searchedProducts;
    return searchedProducts.filter(
      (product) => product.stock <= LOW_STOCK_THRESHOLD,
    );
  }, [searchedProducts, filterLowStock]);

  const displayProducts = useMemo(() => {
    if (!sortField) return lowStockFilteredProducts;
    return [...lowStockFilteredProducts].sort((a, b) =>
      compareProducts(a, b, sortField, sortOrder),
    );
  }, [lowStockFilteredProducts, sortField, sortOrder]);

  const displayProductIds = useMemo(
    () => displayProducts.map((product) => product.id),
    [displayProducts],
  );

  const allDisplayedSelected =
    displayProductIds.length > 0 &&
    displayProductIds.every((id) => selectedProductIds.includes(id));

  const someDisplayedSelected = displayProductIds.some((id) =>
    selectedProductIds.includes(id),
  );

  useEffect(() => {
    setSelectedProductIds((prev) =>
      prev.filter((id) => products.some((product) => product.id === id)),
    );
  }, [products]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someDisplayedSelected && !allDisplayedSelected;
    }
  }, [someDisplayedSelected, allDisplayedSelected]);

  function toggleSelectAll() {
    if (allDisplayedSelected) {
      setSelectedProductIds((prev) =>
        prev.filter((id) => !displayProductIds.includes(id)),
      );
      return;
    }
    setSelectedProductIds((prev) => [
      ...new Set([...prev, ...displayProductIds]),
    ]);
  }

  function toggleSelectProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleBulkDelete() {
    const count = selectedProductIds.length;
    if (count === 0) return;

    const ok = window.confirm(
      `Hapus ${count.toLocaleString("id-ID")} produk terpilih? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!ok) return;

    deleteMultipleProducts(selectedProductIds);
    if (editingId && selectedProductIds.includes(editingId)) {
      closeFormModal();
    }
    setSelectedProductIds([]);
    setStatusMessage(
      `Berhasil menghapus ${count.toLocaleString("id-ID")} produk terpilih.`,
    );
  }

  function openClearAllModal() {
    setClearConfirmText("");
    setIsClearAllModalOpen(true);
  }

  function closeClearAllModal() {
    setIsClearAllModalOpen(false);
    setClearConfirmText("");
  }

  function handleClearAllProducts() {
    if (clearConfirmText.trim() !== "HAPUS") return;

    const count = products.length;
    clearAllProducts();
    if (editingId) closeFormModal();
    setSelectedProductIds([]);
    closeClearAllModal();
    setStatusMessage(
      `Seluruh data produk (${count.toLocaleString("id-ID")} item) berhasil dihapus.`,
    );
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortOrder("asc");
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function closeFormModal() {
    resetForm();
    setIsFormOpen(false);
  }

  function openCreateForm() {
    resetForm();
    setStatusMessage(null);
    setIsFormOpen(true);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      stock: product.stock,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      barcode: product.barcode ?? "",
      hasSerialNumber: inferHasFactorySerial(product),
      serialNumberInput: inferHasFactorySerial(product)
        ? (product.serialNumber ?? "")
        : "",
    });
    setStatusMessage(null);
    setIsFormOpen(true);
  }

  function handleGenerateBarcode() {
    const others = editingId
      ? products.filter((p) => p.id !== editingId)
      : products;
    setForm((f) => ({ ...f, barcode: generateRandomBarcode(others) }));
  }

  function handleDeleteProduct(id: string) {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    const ok = window.confirm(`Hapus produk "${target.name}"?`);
    if (!ok) return;

    deleteProduct(id);
    if (editingId === id) closeFormModal();
    setStatusMessage(`Produk dihapus: ${target.name}`);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      window.alert("Nama produk wajib diisi.");
      return;
    }

    if (form.stock < 0) {
      window.alert("Stok tidak boleh negatif.");
      return;
    }

    if (form.purchasePrice < 0 || form.sellingPrice < 0) {
      window.alert("Harga tidak boleh negatif.");
      return;
    }

    if (form.hasSerialNumber && !form.serialNumberInput.trim()) {
      window.alert("Isi Serial Number dari pabrik jika opsi dicentang.");
      return;
    }

    const serialNumber = resolveSerialOrCode(
      products,
      form.hasSerialNumber,
      form.serialNumberInput,
      editingId,
    );
    const barcode = form.barcode.trim();

    const payload: Omit<Product, "id"> = {
      name,
      category: form.category,
      stock: form.stock,
      purchasePrice: form.purchasePrice,
      sellingPrice: form.sellingPrice,
      serialNumber,
      barcode: barcode || undefined,
    };

    if (isEditMode && editingId) {
      updateProduct(editingId, payload);
      setStatusMessage(
        `Produk diperbarui. Kode/Serial: ${serialNumber ?? "(kosong)"}`,
      );
      closeFormModal();
      return;
    }

    addProduct(payload);
    setStatusMessage(
      `Produk baru ditambah. Kode/Serial: ${serialNumber ?? "(kosong)"}`,
    );
    closeFormModal();
  }

  function handleExportCSV() {
    const csv = buildProductExportCsv(products, LOW_STOCK_THRESHOLD);
    downloadCsvFile(csv, getProductExportFilename());
    setStatusMessage(
      `Berhasil mengekspor ${products.length.toLocaleString("id-ID")} produk ke CSV.`,
    );
  }

  function handleDownloadTemplate() {
    downloadCsvFile(buildProductTemplateCsv(), "template-produk.csv");
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const { items, skipped, errors } = parseImportedProducts(
        text,
        products,
        LOW_STOCK_THRESHOLD,
      );

      if (items.length === 0) {
        window.alert(
          errors[0] ?? "Tidak ada produk valid yang dapat diimpor.",
        );
        setStatusMessage(null);
        return;
      }

      importProducts(items);
      setStatusMessage(
        `Berhasil mengimpor ${items.length.toLocaleString("id-ID")} produk!${
          skipped > 0 ? ` (${skipped} baris dilewati)` : ""
        }`,
      );

      if (errors.length > 0) {
        console.warn("Import CSV warnings:", errors);
      }
    };

    reader.onerror = () => {
      window.alert("Gagal membaca file CSV. Coba lagi.");
    };

    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 sm:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Inventaris & Stok
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Kelola katalog produk, pantau ketersediaan stok, dan perbarui harga
            beli/jual dengan mudah dari satu panel terpusat.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openClearAllModal}
              disabled={products.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hapus Semua Barang
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={products.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <IconPlus className="h-5 w-5" />
              Tambah Produk Baru
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Unduh Format/Template CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCSV}
            aria-label="Import file CSV produk"
          />
        </div>
      </header>

      {statusMessage && (
        <div
          role="status"
          className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <p>{statusMessage}</p>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="rounded-md p-0.5 text-emerald-600 transition hover:bg-emerald-100"
            aria-label="Tutup notifikasi"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      )}

      <section
        aria-label="Ringkasan inventaris"
        className="mb-6 grid gap-4 sm:grid-cols-3"
      >
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Jenis Produk
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
            {stats.totalProducts.toLocaleString("id-ID")}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Item Stok
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-indigo-600">
            {stats.totalStockItems.toLocaleString("id-ID")}
          </p>
        </article>
        <button
          type="button"
          onClick={() => setFilterLowStock((prev) => !prev)}
          aria-pressed={filterLowStock}
          aria-label="Filter produk stok menipis"
          className={`rounded-xl border p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 ${
            filterLowStock
              ? "border-red-400 bg-red-50 ring-2 ring-red-300/60"
              : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Produk Stok Menipis
            {filterLowStock && (
              <span className="ml-2 normal-case text-red-600">· Aktif</span>
            )}
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${
              stats.lowStockCount > 0 ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {stats.lowStockCount.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Stok ≤ {LOW_STOCK_THRESHOLD} unit · Klik untuk filter
          </p>
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk, ID, atau kode/serial..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <label className="shrink-0 text-sm text-slate-600">
              <span className="sr-only">Filter kategori</span>
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ProductCategory | "all")
                }
                className="mt-0 w-full min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 lg:w-auto"
              >
                <option value="all">Semua Kategori</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-400">
              Menampilkan {displayProducts.length.toLocaleString("id-ID")} dari{" "}
              {products.length.toLocaleString("id-ID")} produk
            </p>
            {filterLowStock && (
              <>
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  Filter stok menipis aktif
                </span>
                <button
                  type="button"
                  onClick={() => setFilterLowStock(false)}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Tampilkan Semua
                </button>
              </>
            )}
          </div>
        </div>

        {selectedProductIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-6 py-3">
            <p className="text-sm font-medium text-red-800">
              {selectedProductIds.length.toLocaleString("id-ID")} Barang Terpilih
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Batal Pilihan
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
              >
                <IconTrash className="h-3.5 w-3.5" />
                Hapus Terpilih
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allDisplayedSelected}
                    onChange={toggleSelectAll}
                    disabled={displayProducts.length === 0}
                    aria-label="Pilih semua produk yang ditampilkan"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  ID
                </th>
                <SortableHeader
                  field="name"
                  label="Nama Produk"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kategori
                </th>
                <SortableHeader
                  field="stock"
                  label="Stok"
                  align="center"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  field="modal"
                  label="Harga Beli"
                  align="right"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  field="price"
                  label="Harga Jual"
                  align="right"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kode / Serial
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    {products.length === 0
                      ? "Belum ada produk. Klik \"Tambah Produk Baru\" untuk memulai."
                      : filterLowStock
                        ? "Tidak ada produk stok menipis yang cocok dengan filter saat ini."
                        : "Tidak ada produk yang cocok dengan pencarian atau filter kategori."}
                  </td>
                </tr>
              ) : (
                displayProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`transition-colors hover:bg-slate-50/70 ${
                      selectedProductIds.includes(product.id)
                        ? "bg-indigo-50/40"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleSelectProduct(product.id)}
                        aria-label={`Pilih ${product.name}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {product.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {product.name}
                      </div>
                      {product.barcode ? (
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {product.barcode}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[11px] italic text-slate-300">
                          Tanpa barcode
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {CATEGORY_LABELS[product.category]}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StockBadge stock={product.stock} />
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                      {formatRupiah(product.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium text-slate-900">
                      {formatRupiah(product.sellingPrice)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-600">
                      {formatCodeOrSerial(product)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          title="Edit produk"
                          aria-label={`Edit ${product.name}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <IconPencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          title="Hapus produk"
                          aria-label={`Hapus ${product.name}`}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isClearAllModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-all-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeClearAllModal}
            aria-label="Tutup konfirmasi"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
            <h2
              id="clear-all-title"
              className="text-lg font-semibold text-red-700"
            >
              Hapus Semua Data Produk
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Apakah Anda yakin ingin menghapus{" "}
              <strong>SELURUH</strong> data produk (
              {products.length.toLocaleString("id-ID")} item)? Tindakan ini
              tidak dapat dibatalkan.
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Ketik <span className="font-mono text-red-600">HAPUS</span> untuk
              konfirmasi
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="HAPUS"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                autoComplete="off"
              />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeClearAllModal}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllProducts}
                disabled={clearConfirmText.trim() !== "HAPUS"}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeFormModal}
            aria-label="Tutup formulir"
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="product-form-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {isEditMode ? "Edit Produk" : "Tambah Produk Baru"}
                </h2>
                {isEditMode && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    ID: {editingId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
              <label className="block text-sm font-medium text-slate-700">
                Nama Produk
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={INPUT_CLASS}
                  placeholder="Contoh: Logitech MX Master 3S"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Kategori
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as ProductCategory,
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="block text-sm font-medium text-slate-700">
                  Kode Barcode
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, barcode: e.target.value }))
                    }
                    placeholder="Contoh: 8991234567890"
                    className={`${INPUT_CLASS} mt-0 min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="mt-0 shrink-0 self-end rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Generate Auto
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Digunakan untuk scan cepat di Kasir. Kosongkan jika tidak ada
                  barcode fisik.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  Stok
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stock: Number(e.target.value) || 0,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Harga Beli
                  <input
                    type="number"
                    min={0}
                    value={form.purchasePrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        purchasePrice: Number(e.target.value) || 0,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Harga Jual
                  <input
                    type="number"
                    min={0}
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sellingPrice: Number(e.target.value) || 0,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.hasSerialNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        hasSerialNumber: e.target.checked,
                        serialNumberInput: e.target.checked
                          ? f.serialNumberInput
                          : "",
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-700">
                      Memiliki Serial Number pabrik
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Centang jika perlu input serial manual; jika tidak, kode
                      BRG digenerate otomatis.
                    </span>
                  </span>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                {form.hasSerialNumber
                  ? "Serial Number (pabrik)"
                  : "Kode Barang (otomatis)"}
                {form.hasSerialNumber ? (
                  <input
                    type="text"
                    placeholder="Contoh: SN-ROG-10293"
                    value={form.serialNumberInput}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        serialNumberInput: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                ) : (
                  <p className="mt-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    {isEditMode
                      ? "Kode BRG yang sudah ada akan dipertahankan saat simpan."
                      : `Kode baru akan digenerate otomatis (contoh: BRG-${String(products.length + 1).padStart(3, "0")}).`}
                  </p>
                )}
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  {isEditMode ? "Simpan Perubahan" : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
