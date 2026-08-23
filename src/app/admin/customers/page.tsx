"use client";

import { useMemo, useState } from "react";
import { CUSTOMER_TYPE_LABEL } from "@/lib/customer";
import { useApp } from "@/src/context/AppContext";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import type { Customer, CustomerInput, CustomerType } from "@/types/customer";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

const TYPE_BADGE: Record<CustomerType, string> = {
  REGULAR: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  CORPORATE: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
};

export default function AdminCustomersPage() {
  const {
    customers,
    debts,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const outstandingByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const debt of debts) {
      if (debt.remainingAmount <= 0 || debt.status === "PAID") continue;
      map.set(
        debt.customerId,
        (map.get(debt.customerId) ?? 0) + debt.remainingAmount,
      );
    }
    return map;
  }, [debts]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers
      .filter((customer) => {
        if (typeFilter !== "ALL" && customer.type !== typeFilter) return false;
        if (!q) return true;
        return (
          customer.name.toLowerCase().includes(q) ||
          customer.code.toLowerCase().includes(q) ||
          customer.phone.toLowerCase().includes(q) ||
          (customer.address?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }));
  }, [customers, searchQuery, typeFilter]);

  function openCreateModal() {
    setEditingCustomer(null);
    setModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setModalOpen(true);
  }

  function handleSave(input: CustomerInput) {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, input);
    } else {
      addCustomer(input);
    }
  }

  function handleDelete(customer: Customer) {
    const outstanding = outstandingByCustomer.get(customer.id) ?? 0;
    if (outstanding > 0) {
      window.alert(
        `Tidak bisa menghapus ${customer.name}: masih ada sisa utang ${formatRupiah(outstanding)}.`,
      );
      return;
    }

    const ok = window.confirm(
      `Hapus pelanggan "${customer.name}" (${customer.code})?`,
    );
    if (!ok) return;

    try {
      deleteCustomer(customer.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal menghapus pelanggan.",
      );
    }
  }

  return (
    <>
      <div className="p-6 sm:p-8 print:hidden">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Daftar Pelanggan
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Master data pelanggan / instansi untuk Kasir dan Manajemen Utang.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            + Tambah Pelanggan
          </button>
        </header>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block max-w-md flex-1 text-sm text-slate-400">
            Cari Nama / Kantor / HP
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama, kode, HP, alamat…"
              className={`${INPUT_CLASS} mt-1.5`}
            />
          </label>

          <div
            className="inline-flex flex-wrap rounded-xl border border-slate-700 bg-slate-900 p-1"
            role="group"
            aria-label="Filter tipe pelanggan"
          >
            {(
              [
                { value: "ALL", label: "Semua" },
                { value: "REGULAR", label: "Biasa" },
                { value: "CORPORATE", label: "Instansi" },
              ] as const
            ).map((option) => {
              const active = typeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(option.value)}
                  aria-pressed={active}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Kode & Nama</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3 text-right">Sisa Utang</th>
                  <th className="px-4 py-3 text-right">Limit</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {customers.length === 0
                        ? "Belum ada pelanggan. Tambahkan data master pelanggan."
                        : "Tidak ada pelanggan yang cocok dengan filter."}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const outstanding =
                      outstandingByCustomer.get(customer.id) ?? 0;
                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-800/80 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-100">
                            {customer.name}
                          </p>
                          <p className="font-mono text-xs text-cyan-300">
                            {customer.code}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[customer.type]}`}
                          >
                            {customer.type}
                          </span>
                          <p className="mt-1 text-xs text-slate-500">
                            {CUSTOMER_TYPE_LABEL[customer.type]}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="tabular-nums text-slate-200">
                            {customer.phone}
                          </p>
                          <p className="max-w-xs text-xs text-slate-500 line-clamp-2">
                            {customer.address || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-300">
                          {formatRupiah(outstanding)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                          {customer.creditLimit != null
                            ? formatRupiah(customer.creditLimit)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(customer)}
                              className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(customer)}
                              className="rounded-lg border border-red-500/40 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/40"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan {filteredCustomers.length} dari {customers.length}{" "}
          pelanggan · Total sisa utang dihitung dari piutang berjalan.
        </p>
      </div>

      <CustomerFormModal
        open={modalOpen}
        title={editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan"}
        initialCustomer={editingCustomer}
        submitLabel={editingCustomer ? "Simpan Perubahan" : "Tambah Pelanggan"}
        onClose={() => {
          setModalOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleSave}
      />
    </>
  );
}
