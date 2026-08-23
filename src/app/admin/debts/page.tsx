"use client";

import { useMemo, useState } from "react";
import {
  countDebtsDueThisWeek,
  countDebtorCustomers,
  sumOutstandingDebt,
} from "@/lib/debt";
import { getTransactionItemSubtotal } from "@/lib/transaction";
import { useApp } from "@/src/context/AppContext";
import type { Debt, DebtStatus } from "@/types/debt";
import type { Transaction } from "@/types/transaction";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const STATUS_BADGE: Record<
  DebtStatus,
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Belum Bayar",
    className: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  },
  PARTIAL: {
    label: "Cicilan",
    className: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  },
  PAID: {
    label: "Lunas",
    className: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  },
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

function parsePaymentInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export default function AdminDebtsPage() {
  const { debts, transactions, customers, payDebt } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "ALL">("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");

  const [payModalDebt, setPayModalDebt] = useState<Debt | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [itemsModalDebt, setItemsModalDebt] = useState<Debt | null>(null);

  const uniqueCustomers = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();

    for (const customer of customers) {
      byId.set(customer.id, { id: customer.id, name: customer.name });
    }

    for (const debt of debts) {
      const id = debt.customerId || debt.customerName;
      if (!byId.has(id)) {
        byId.set(id, { id, name: debt.customerName });
      } else {
        const existing = byId.get(id)!;
        if (!existing.name && debt.customerName) {
          byId.set(id, { id, name: debt.customerName });
        }
      }
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "id", { sensitivity: "base" }),
    );
  }, [customers, debts]);

  const customerScopedDebts = useMemo(() => {
    if (selectedCustomer === "ALL") return debts;
    return debts.filter(
      (debt) =>
        debt.customerId === selectedCustomer ||
        debt.customerName === selectedCustomer,
    );
  }, [debts, selectedCustomer]);

  const selectedCustomerName = useMemo(() => {
    if (selectedCustomer === "ALL") return null;
    return (
      uniqueCustomers.find((c) => c.id === selectedCustomer)?.name ??
      selectedCustomer
    );
  }, [selectedCustomer, uniqueCustomers]);

  const selectedCustomerOutstanding = useMemo(
    () => sumOutstandingDebt(customerScopedDebts),
    [customerScopedDebts],
  );

  const stats = useMemo(
    () => ({
      totalOutstanding: sumOutstandingDebt(customerScopedDebts),
      debtorCount: countDebtorCustomers(customerScopedDebts),
      dueThisWeek: countDebtsDueThisWeek(customerScopedDebts),
    }),
    [customerScopedDebts],
  );

  const transactionById = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const tx of transactions) {
      map.set(tx.id, tx);
    }
    return map;
  }, [transactions]);

  const filteredDebts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customerScopedDebts.filter((debt) => {
      if (statusFilter !== "ALL" && debt.status !== statusFilter) return false;
      if (!q) return true;
      return (
        debt.id.toLowerCase().includes(q) ||
        debt.customerName.toLowerCase().includes(q) ||
        debt.customerPhone.toLowerCase().includes(q) ||
        debt.transactionId.toLowerCase().includes(q)
      );
    });
  }, [customerScopedDebts, searchQuery, statusFilter]);

  function openPayModal(debt: Debt) {
    setPayModalDebt(debt);
    setPaymentAmountInput(String(debt.remainingAmount));
    setPaymentNote("");
  }

  function closePayModal() {
    setPayModalDebt(null);
    setPaymentAmountInput("");
    setPaymentNote("");
  }

  function handleSubmitPayment() {
    if (!payModalDebt) return;

    const amount = parsePaymentInput(paymentAmountInput);
    if (amount <= 0) {
      window.alert("Nominal pembayaran harus lebih dari 0.");
      return;
    }
    if (amount > payModalDebt.remainingAmount) {
      window.alert(
        `Nominal melebihi sisa utang (${formatRupiah(payModalDebt.remainingAmount)}).`,
      );
      return;
    }

    payDebt(payModalDebt.id, amount, paymentNote.trim() || undefined);
    closePayModal();
  }

  const itemsModalTransaction = itemsModalDebt
    ? transactionById.get(itemsModalDebt.transactionId)
    : undefined;

  return (
    <>
      <div className="p-6 sm:p-8 print:hidden">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-white">
            Manajemen Utang / Piutang
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Kelola utang pelanggan dari transaksi tempo di Kasir.
          </p>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Total Piutang Berjalan</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">
              {formatRupiah(stats.totalOutstanding)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Total Pelanggan Berutang</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {stats.debtorCount.toLocaleString("id-ID")}
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">Jatuh Tempo Minggu Ini</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-300">
              {stats.dueThisWeek.toLocaleString("id-ID")}
            </p>
          </article>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block text-sm text-slate-400">
              Cari Pelanggan / Nota / ID Utang
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, HP, DEBT-0001, INV-..."
                className={`${INPUT_CLASS} mt-1.5 max-w-md`}
              />
            </label>

            <label className="block text-sm text-slate-400">
              Filter Pelanggan
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5 min-w-[12rem] rounded-xl`}
                aria-label="Filter pelanggan"
              >
                <option value="ALL">Semua Pelanggan</option>
                {uniqueCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className="inline-flex flex-wrap rounded-lg border border-slate-700 bg-slate-900 p-1"
            role="group"
            aria-label="Filter status utang"
          >
            {(
              [
                { value: "ALL", label: "Semua" },
                { value: "UNPAID", label: "Belum Bayar" },
                { value: "PARTIAL", label: "Cicilan" },
                { value: "PAID", label: "Lunas" },
              ] as const
            ).map((option) => {
              const active = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  aria-pressed={active}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
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

        {selectedCustomerName && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            Total Sisa Utang{" "}
            <span className="font-medium text-slate-100">
              {selectedCustomerName}
            </span>
            :{" "}
            <span className="font-semibold tabular-nums text-amber-300">
              {formatRupiah(selectedCustomerOutstanding)}
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID Utang</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Nota</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Terbayar</th>
                  <th className="px-4 py-3 text-right">Sisa</th>
                  <th className="px-4 py-3">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {debts.length === 0
                        ? "Belum ada utang. Buat transaksi tempo di Kasir untuk mencatat piutang."
                        : "Tidak ada utang yang cocok dengan filter atau pencarian."}
                    </td>
                  </tr>
                ) : (
                  filteredDebts.map((debt) => {
                    const badge = STATUS_BADGE[debt.status];
                    const canPay =
                      debt.status !== "PAID" && debt.remainingAmount > 0;

                    return (
                      <tr
                        key={debt.id}
                        className="border-b border-slate-800/80 hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                          {debt.id}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-100">
                            {debt.customerName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {debt.customerPhone}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {debt.transactionId}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                          {formatRupiah(debt.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                          {formatRupiah(debt.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-300">
                          {formatRupiah(debt.remainingAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {formatDate(debt.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setItemsModalDebt(debt)}
                              className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-800"
                            >
                              Rincian Barang
                            </button>
                            {canPay && (
                              <button
                                type="button"
                                onClick={() => openPayModal(debt)}
                                className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-500"
                              >
                                Bayar / Cicil
                              </button>
                            )}
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
      </div>

      {/* Modal Bayar / Cicil */}
      {payModalDebt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-debt-title"
        >
          <button
            type="button"
            aria-label="Tutup modal"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closePayModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2
              id="pay-debt-title"
              className="text-lg font-semibold text-white"
            >
              Bayar / Cicil Utang
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {payModalDebt.customerName} · {payModalDebt.id}
            </p>

            <dl className="mt-4 space-y-2 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <dt>Total Utang</dt>
                <dd className="tabular-nums text-slate-200">
                  {formatRupiah(payModalDebt.totalAmount)}
                </dd>
              </div>
              <div className="flex justify-between text-slate-400">
                <dt>Sudah Dibayar</dt>
                <dd className="tabular-nums text-emerald-300">
                  {formatRupiah(payModalDebt.paidAmount)}
                </dd>
              </div>
              <div className="flex justify-between font-semibold text-amber-200">
                <dt>Sisa Utang</dt>
                <dd className="tabular-nums">
                  {formatRupiah(payModalDebt.remainingAmount)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3">
              <label className="block text-xs text-slate-400">
                Nominal Pembayaran *
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${INPUT_CLASS} mt-1 tabular-nums`}
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-400">
                Catatan (opsional)
                <input
                  type="text"
                  className={`${INPUT_CLASS} mt-1`}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Misal: cicilan ke-2"
                />
              </label>
            </div>

            {payModalDebt.paymentHistory.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Riwayat Pembayaran
                </p>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs">
                  {payModalDebt.paymentHistory.map((log) => (
                    <li
                      key={log.id}
                      className="flex justify-between rounded border border-slate-800 px-2 py-1.5 text-slate-400"
                    >
                      <span>
                        {formatTimestamp(log.date)}
                        {log.note ? ` · ${log.note}` : ""}
                      </span>
                      <span className="tabular-nums text-emerald-300">
                        {formatRupiah(log.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closePayModal}
                className="rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                className="rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Simpan Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rincian Barang */}
      {itemsModalDebt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="items-debt-title"
        >
          <button
            type="button"
            aria-label="Tutup modal"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setItemsModalDebt(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2
              id="items-debt-title"
              className="text-lg font-semibold text-white"
            >
              Rincian Barang
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Nota {itemsModalDebt.transactionId} · {itemsModalDebt.customerName}
            </p>

            {!itemsModalTransaction ? (
              <p className="mt-6 text-sm text-slate-500">
                Transaksi terkait tidak ditemukan.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Produk</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsModalTransaction.items.map((item) => (
                      <tr
                        key={`${item.productId}-${item.unitPrice}`}
                        className="border-b border-slate-800/80"
                      >
                        <td className="px-3 py-2 text-slate-200">
                          {item.productName}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-slate-400">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-cyan-300">
                          {formatRupiah(getTransactionItemSubtotal(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-800 bg-slate-950/50">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-right text-slate-400"
                      >
                        Total Belanja
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-white">
                        {formatRupiah(itemsModalTransaction.totalHarga)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => setItemsModalDebt(null)}
              className="mt-6 w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
