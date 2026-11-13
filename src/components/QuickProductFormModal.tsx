"use client";

import { useState } from "react";
import { generateRandomBarcode } from "@/lib/admin-product";
import type { Product, ProductCategory } from "@/types/product";
import { INPUT_CLASS, SELECT_CLASS } from "@/lib/ui-classes";

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

interface QuickProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, "id">) => Promise<void>;
  existingProducts: Product[];
  initialBarcode?: string;
}

export default function QuickProductFormModal({
  isOpen,
  onClose,
  onSave,
  existingProducts,
  initialBarcode = "",
}: QuickProductFormModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("accessory");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [stock, setStock] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleGenerateBarcode() {
    const generated = generateRandomBarcode(existingProducts);
    setBarcode(generated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Nama produk wajib diisi.");
      return;
    }

    const priceNum = Number.parseInt(sellingPrice.replace(/\D/g, "") || "0", 10);
    if (priceNum <= 0) {
      setError("Harga jual produk harus lebih dari Rp 0.");
      return;
    }

    const modalNum = Number.parseInt(purchasePrice.replace(/\D/g, "") || "0", 10);
    const stockNum = Math.max(0, Number.parseInt(stock || "0", 10));

    try {
      setIsSubmitting(true);
      await onSave({
        name: trimmedName,
        category,
        barcode: barcode.trim() || undefined,
        sellingPrice: priceNum,
        purchasePrice: modalNum,
        stock: stockNum,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan produk.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-product-title"
    >
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 id="quick-product-title" className="text-base font-bold text-white flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5 text-indigo-400"
                aria-hidden
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Tambah Produk Baru
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Registrasi barang baru langsung ke katalog & database kasir
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Tutup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/50 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Nama Produk */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Nama Produk / Barang <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Flashdisk Sandisk 32GB Ultra"
              className={`${INPUT_CLASS} w-full`}
            />
          </div>

          {/* Barcode / Kode SKU */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Barcode / Kode SKU
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan barcode fisik atau klik generate..."
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-400 hover:bg-slate-700 hover:text-white shrink-0"
                title="Buat kode barcode acak otomatis"
              >
                Generate Barcode
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Dapat discan saat transaksi kasir. Kosongkan jika ingin sistem menggunakan ID barang.
            </p>
          </div>

          {/* Kategori & Stok */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className={`${SELECT_CLASS} w-full`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Stok Awal
              </label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={`${INPUT_CLASS} w-full`}
              />
            </div>
          </div>

          {/* Harga Jual & Harga Beli */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Harga Jual (Rp) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={sellingPrice}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setSellingPrice(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                placeholder="Contoh: 85.000"
                className={`${INPUT_CLASS} w-full font-bold text-white`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Harga Modal / Beli (Rp)
              </label>
              <input
                type="text"
                value={purchasePrice}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setPurchasePrice(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                placeholder="Contoh: 60.000"
                className={`${INPUT_CLASS} w-full`}
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

