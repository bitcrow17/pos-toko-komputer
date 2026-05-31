"use client";

import Link from "next/link";
import { useState } from "react";
import { mockProducts } from "@/src/data/mockData";
import {
  createNextProductId,
  formatCodeOrSerial,
  inferHasFactorySerial,
  resolveSerialOrCode,
} from "@/lib/admin-product";
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

const EMPTY_FORM = {
  name: "",
  category: "other" as ProductCategory,
  stock: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  hasSerialNumber: false,
  serialNumberInput: "",
};

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminProdukPage() {
  const [products, setProducts] = useState<Product[]>(() =>
    mockProducts.map((p) => ({ ...p })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isEditMode = editingId !== null;

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startCreate() {
    resetForm();
    setStatusMessage(null);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      stock: product.stock,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      hasSerialNumber: inferHasFactorySerial(product),
      serialNumberInput: inferHasFactorySerial(product)
        ? (product.serialNumber ?? "")
        : "",
    });
    setStatusMessage(`Mode edit: ${product.name}`);
  }

  function deleteProduct(id: string) {
    const target = products.find((p) => p.id === id);
    if (!target) return;

    const ok = window.confirm(`Hapus produk "${target.name}"?`);
    if (!ok) return;

    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) resetForm();
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

    const payload: Omit<Product, "id"> = {
      name,
      category: form.category,
      stock: form.stock,
      purchasePrice: form.purchasePrice,
      sellingPrice: form.sellingPrice,
      serialNumber,
    };

    if (isEditMode && editingId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId ? { ...p, ...payload, id: editingId } : p,
        ),
      );
      setStatusMessage(
        `Produk diperbarui. Kode/Serial: ${serialNumber ?? "(kosong)"}`,
      );
      resetForm();
      return;
    }

    const newProduct: Product = {
      id: createNextProductId(products),
      ...payload,
    };

    setProducts((prev) => [...prev, newProduct]);
    setStatusMessage(
      `Produk baru ditambah (${newProduct.id}). Kode/Serial: ${serialNumber ?? "(kosong)"}`,
    );
    resetForm();
  }

  return (
    <div>
      <h1>Manajemen Barang (Admin)</h1>
      <p>
        <Link href="/">← Dashboard</Link> · <Link href="/kasir">Kasir</Link>
      </p>

      {statusMessage && (
        <p>
          <strong>Status:</strong> {statusMessage}
        </p>
      )}

      <hr />

      <h2>{isEditMode ? "Edit Barang" : "Tambah Barang Baru"}</h2>
      {isEditMode && (
        <p>
          Mengedit ID: <code>{editingId}</code>{" "}
          <button type="button" onClick={startCreate}>
            Batal Edit
          </button>
        </p>
      )}

      <form onSubmit={handleSave}>
        <table border={1} cellPadding={6}>
          <tbody>
            <tr>
              <td>Nama</td>
              <td>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>Kategori</td>
              <td>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as ProductCategory,
                    }))
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td>Stok</td>
              <td>
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
                />
              </td>
            </tr>
            <tr>
              <td>Harga Beli</td>
              <td>
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
                />
              </td>
            </tr>
            <tr>
              <td>Harga Jual</td>
              <td>
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
                />
              </td>
            </tr>
            <tr>
              <td>Memiliki Serial Number</td>
              <td>
                <label>
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
                  />{" "}
                  Centang = input serial pabrik manual
                </label>
              </td>
            </tr>
            <tr>
              <td>
                {form.hasSerialNumber
                  ? "Serial Number (pabrik)"
                  : "Kode Barang (otomatis)"}
              </td>
              <td>
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
                  />
                ) : (
                  <span>
                    {isEditMode
                      ? "Saat simpan, kode BRG baru hanya dibuat untuk barang baru tanpa centang."
                      : `Akan digenerate otomatis (contoh: BRG-${String(products.length + 1).padStart(3, "0")} berurutan dari nomor terakhir)`}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          <button type="submit">
            {isEditMode ? "Simpan Perubahan (Edit)" : "Simpan (Tambah Baru)"}
          </button>{" "}
          <button type="button" onClick={startCreate}>
            Reset Form
          </button>
        </p>
      </form>

      <hr />

      <h2>Daftar Barang ({products.length})</h2>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama</th>
            <th>Kategori</th>
            <th>Stok</th>
            <th>Harga Beli</th>
            <th>Harga Jual</th>
            <th>Kode / Serial Number</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={8}>Belum ada produk.</td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.category}</td>
                <td>{product.stock}</td>
                <td>{formatRupiah(product.purchasePrice)}</td>
                <td>{formatRupiah(product.sellingPrice)}</td>
                <td>{formatCodeOrSerial(product)}</td>
                <td>
                  <button type="button" onClick={() => startEdit(product)}>
                    Edit
                  </button>{" "}
                  <button type="button" onClick={() => deleteProduct(product.id)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
