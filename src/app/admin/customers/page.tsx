"use client";

import { useMemo, useState } from "react";
import { CUSTOMER_TYPE_LABEL } from "@/lib/customer";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_CLASS,
  PAGE_WRAPPER,
  TAB_GROUP_CLASS,
  TABLE_BODY_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
  TABLE_WRAPPER_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import PageHeader from "@/src/components/ui/PageHeader";
import type { Customer, CustomerInput, CustomerType } from "@/types/customer";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const TYPE_BADGE: Record<CustomerType, string> = {
  REGULAR: "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700",
  CORPORATE: "rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700",
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
      <div className={PAGE_WRAPPER}>
        <PageHeader
          title="Master Pelanggan"
          subtitle="Data pelanggan / instansi untuk Kasir dan Manajemen Utang."
          actions={
            <button type="button" onClick={openCreateModal} className={BTN_PRIMARY}>
              + Tambah Pelanggan
            </button>
          }
        />

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block max-w-md flex-1 text-sm font-medium text-slate-600">
            Cari Nama / Kantor / HP
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama, kode, HP, alamat…"
              className={`${INPUT_CLASS} mt-1.5`}
            />
          </label>

          <div className={TAB_GROUP_CLASS} role="group" aria-label="Filter tipe pelanggan">
            {(
              [
                { value: "ALL", label: "Semua" },
                { value: "REGULAR", label: "Biasa" },
                { value: "CORPORATE", label: "Instansi" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                aria-pressed={typeFilter === option.value}
                className={tabButtonClass(typeFilter === option.value, "indigo")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-left text-sm">
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className="px-4 py-3">Kode & Nama</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3 text-right">Sisa Utang</th>
                <th className="px-4 py-3 text-right">Limit</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className={TABLE_BODY_CLASS}>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {customers.length === 0
                      ? "Belum ada pelanggan. Tambahkan data master pelanggan."
                      : "Tidak ada pelanggan yang cocok dengan filter."}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const outstanding = outstandingByCustomer.get(customer.id) ?? 0;
                  return (
                    <tr key={customer.id} className={TABLE_ROW_CLASS}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{customer.name}</p>
                        <p className="font-mono text-xs text-indigo-600">{customer.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block ${TYPE_BADGE[customer.type]}`}>
                          {customer.type}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                          {CUSTOMER_TYPE_LABEL[customer.type]}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="tabular-nums text-slate-800">{customer.phone}</p>
                        <p className="line-clamp-2 max-w-xs text-xs text-slate-500">
                          {customer.address || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-700">
                        {formatRupiah(outstanding)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {customer.creditLimit != null
                          ? formatRupiah(customer.creditLimit)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(customer)}
                            className={`${BTN_SECONDARY} px-2.5 py-1.5 text-xs`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(customer)}
                            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
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

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan {filteredCustomers.length} dari {customers.length} pelanggan ·
          Total sisa utang dihitung dari piutang berjalan.
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
