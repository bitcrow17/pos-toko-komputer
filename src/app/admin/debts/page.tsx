"use client";

import { useMemo, useState } from "react";
import {
  countDebtsDueThisWeek,
  countDebtorCustomers,
  sumOutstandingDebt,
} from "@/lib/debt";
import { getTransactionItemSubtotal } from "@/lib/transaction";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_CLASS,
  MODAL_OVERLAY,
  MODAL_PANEL,
  PAGE_WRAPPER,
  SELECT_CLASS,
  STAT_CARD,
  STATUS_BADGE,
  TAB_GROUP_CLASS,
  TABLE_BODY_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
  TABLE_WRAPPER_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import PageHeader from "@/src/components/ui/PageHeader";
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

const STATUS_BADGE_MAP: Record<DebtStatus, { label: string; className: string }> = {
  UNPAID: { label: "Belum Bayar", className: STATUS_BADGE.unpaid },
  PARTIAL: { label: "Cicilan", className: STATUS_BADGE.partial },
  PAID: { label: "Lunas", className: STATUS_BADGE.paid },
};

type UniqueDebtCustomer = {
  id: string;
  name: string;
  phone: string;
};

function uniqueCustomersFromDebts(debts: Debt[]): UniqueDebtCustomer[] {
  const byKey = new Map<string, UniqueDebtCustomer>();

  for (const debt of debts) {
    const key = debt.customerId.trim() || debt.customerName.trim();
    if (!key) continue;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      id: key,
      name: debt.customerName,
      phone: debt.customerPhone,
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "id", { sensitivity: "base" }),
  );
}

function isSameCustomer(debt: Debt, selectedCustomer: string): boolean {
  return (
    debt.customerId === selectedCustomer ||
    debt.customerName === selectedCustomer
  );
}

function parsePaymentInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export default function AdminDebtsPage() {
  const { debts, transactions, payDebt } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "ALL">("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");

  const [payModalDebt, setPayModalDebt] = useState<Debt | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [itemsModalDebt, setItemsModalDebt] = useState<Debt | null>(null);

  const uniqueCustomers = useMemo(
    () => uniqueCustomersFromDebts(debts),
    [debts],
  );

  const duplicateCustomerNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const customer of uniqueCustomers) {
      counts.set(customer.name, (counts.get(customer.name) ?? 0) + 1);
    }
    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    );
  }, [uniqueCustomers]);

  const customerScopedDebts = useMemo(() => {
    if (selectedCustomer === "ALL") return debts;
    return debts.filter((debt) => isSameCustomer(debt, selectedCustomer));
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
      <div className={PAGE_WRAPPER}>
        <PageHeader
          title="Manajemen Utang / Piutang"
          subtitle="Kelola utang pelanggan dari transaksi tempo di Kasir."
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className={STAT_CARD}>
            <p className="text-sm text-slate-500">Total Piutang Berjalan</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">
              {formatRupiah(stats.totalOutstanding)}
            </p>
          </article>
          <article className={STAT_CARD}>
            <p className="text-sm text-slate-500">Total Pelanggan Berutang</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800">
              {stats.debtorCount.toLocaleString("id-ID")}
            </p>
          </article>
          <article className={STAT_CARD}>
            <p className="text-sm text-slate-500">Jatuh Tempo Minggu Ini</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-red-600">
              {stats.dueThisWeek.toLocaleString("id-ID")}
            </p>
          </article>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block text-sm font-medium text-slate-600">
              Cari Pelanggan / Nota / ID Utang
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, HP, DEBT-0001, INV-..."
                className={`${INPUT_CLASS} mt-1.5 max-w-md`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-600">
              Filter Pelanggan
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className={`${SELECT_CLASS} mt-1.5 min-w-[14rem]`}
                aria-label="Filter pelanggan"
              >
                <option value="ALL">Semua Pelanggan</option>
                {uniqueCustomers.map((customer) => {
                  const label =
                    duplicateCustomerNames.has(customer.name) && customer.phone
                      ? `${customer.name} (${customer.phone})`
                      : customer.name;
                  return (
                    <option key={customer.id} value={customer.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <div className={TAB_GROUP_CLASS} role="group" aria-label="Filter status utang">
            {(
              [
                { value: "ALL", label: "Semua" },
                { value: "UNPAID", label: "Belum Bayar" },
                { value: "PARTIAL", label: "Cicilan" },
                { value: "PAID", label: "Lunas" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                aria-pressed={statusFilter === option.value}
                className={tabButtonClass(statusFilter === option.value, "indigo")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {selectedCustomerName && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Total Sisa Utang{" "}
            <span className="font-medium">{selectedCustomerName}</span>:{" "}
            <span className="font-semibold tabular-nums">
              {formatRupiah(selectedCustomerOutstanding)}
            </span>
          </div>
        )}

        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-left text-sm">
            <thead className={TABLE_HEAD_CLASS}>
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
            <tbody className={TABLE_BODY_CLASS}>
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
                    const badge = STATUS_BADGE_MAP[debt.status];
                    const canPay =
                      debt.status !== "PAID" && debt.remainingAmount > 0;

                    return (
                      <tr key={debt.id} className={TABLE_ROW_CLASS}>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                          {debt.id}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {debt.customerName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {debt.customerPhone}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {debt.transactionId}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                          {formatRupiah(debt.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                          {formatRupiah(debt.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-700">
                          {formatRupiah(debt.remainingAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(debt.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setItemsModalDebt(debt)}
                              className={`${BTN_SECONDARY} px-2.5 py-1.5 text-xs`}
                            >
                              Rincian Barang
                            </button>
                            {canPay && (
                              <button
                                type="button"
                                onClick={() => openPayModal(debt)}
                                className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700"
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
            className={MODAL_OVERLAY}
            onClick={closePayModal}
          />
          <div className={`${MODAL_PANEL} max-w-md`}>
            <h2 id="pay-debt-title" className="text-lg font-semibold text-slate-800">
              Bayar / Cicil Utang
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {payModalDebt.customerName} · {payModalDebt.id}
            </p>

            <dl className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Total Utang</dt>
                <dd className="tabular-nums text-slate-800">
                  {formatRupiah(payModalDebt.totalAmount)}
                </dd>
              </div>
              <div className="flex justify-between text-slate-600">
                <dt>Sudah Dibayar</dt>
                <dd className="tabular-nums text-emerald-700">
                  {formatRupiah(payModalDebt.paidAmount)}
                </dd>
              </div>
              <div className="flex justify-between font-semibold text-amber-800">
                <dt>Sisa Utang</dt>
                <dd className="tabular-nums">
                  {formatRupiah(payModalDebt.remainingAmount)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">
                Nominal Pembayaran *
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${INPUT_CLASS} mt-1 tabular-nums`}
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
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
                      className="flex justify-between rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600"
                    >
                      <span>
                        {formatTimestamp(log.date)}
                        {log.note ? ` · ${log.note}` : ""}
                      </span>
                      <span className="tabular-nums text-emerald-700">
                        {formatRupiah(log.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={closePayModal} className={BTN_SECONDARY}>
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                className="rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
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
            className={MODAL_OVERLAY}
            onClick={() => setItemsModalDebt(null)}
          />
          <div className={`${MODAL_PANEL} max-w-lg`}>
            <h2 id="items-debt-title" className="text-lg font-semibold text-slate-800">
              Rincian Barang
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Nota {itemsModalDebt.transactionId} · {itemsModalDebt.customerName}
            </p>

            {!itemsModalTransaction ? (
              <p className="mt-6 text-sm text-slate-500">
                Transaksi terkait tidak ditemukan.
              </p>
            ) : (
              <div className={`${TABLE_WRAPPER_CLASS} mt-4`}>
                <table className="w-full text-left text-sm">
                  <thead className={TABLE_HEAD_CLASS}>
                    <tr>
                      <th className="px-3 py-2">Produk</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className={TABLE_BODY_CLASS}>
                    {itemsModalTransaction.items.map((item) => (
                      <tr
                        key={`${item.productId}-${item.unitPrice}`}
                        className={TABLE_ROW_CLASS}
                      >
                        <td className="px-3 py-2 text-slate-800">
                          {item.productName}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-slate-600">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-indigo-700">
                          {formatRupiah(getTransactionItemSubtotal(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-slate-600">
                        Total Belanja
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">
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
              className={`${BTN_SECONDARY} mt-6 w-full`}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
