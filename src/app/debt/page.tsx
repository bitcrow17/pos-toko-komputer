"use client";

import { useMemo, useState } from "react";
import ModuleNav from "@/src/components/ModuleNav";
import {
  countDebtsDueThisWeek,
  countDebtorCustomers,
  sumOutstandingDebt,
  buildDebtFromInput,
} from "@/lib/debt";
import { getTransactionItemSubtotal } from "@/lib/transaction";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_CLASS,
  MODAL_OVERLAY,
  MODAL_PANEL,
  SELECT_CLASS,
  STATUS_BADGE,
  TAB_GROUP_CLASS,
  TABLE_BODY_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
  TABLE_WRAPPER_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import KasirDebtPaymentPanel from "@/src/components/KasirDebtPaymentPanel";
import DebtPaymentReceiptModal from "@/src/components/DebtPaymentReceiptModal";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import { useApp } from "@/src/context/AppContext";
import { useToast } from "@/src/components/ui/Toast";
import type { Debt, DebtStatus } from "@/types/debt";
import type {
  DebtPaymentReceipt,
  DebtSettlementMethod,
} from "@/types/debt-payment";
import type { Transaction } from "@/types/transaction";

type DebtTab = "list" | "quick-pay";

type UniqueDebtCustomer = {
  id: string;
  name: string;
  phone: string;
};

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

function parsePaymentInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

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

function generateDebtReceiptId(): string {
  return `RCP-DEBT-${Date.now()}`;
}

export default function DebtPage() {
  const { debts, customers, transactions, payDebt, addDebt, addCustomer, addTransaction } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<DebtTab>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DebtStatus | "ALL">("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");

  // Modals state
  const [payModalDebt, setPayModalDebt] = useState<Debt | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<DebtSettlementMethod>("CASH");
  const [paymentNote, setPaymentNote] = useState("");

  const [itemsModalDebt, setItemsModalDebt] = useState<Debt | null>(null);
  const [debtReceipt, setDebtReceipt] = useState<DebtPaymentReceipt | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [manualDebtModalOpen, setManualDebtModalOpen] = useState(false);

  // Manual debt input state
  const [manualCustomerId, setManualCustomerId] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerPhone, setManualCustomerPhone] = useState("");
  const [manualAmountInput, setManualAmountInput] = useState("");
  const [manualDueDate, setManualDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [manualNotes, setManualNotes] = useState("");

  const uniqueCustomers = useMemo(
    () => uniqueCustomersFromDebts(debts),
    [debts],
  );

  const customerScopedDebts = useMemo(() => {
    if (selectedCustomer === "ALL") return debts;
    return debts.filter((debt) => isSameCustomer(debt, selectedCustomer));
  }, [debts, selectedCustomer]);

  const stats = useMemo(() => {
    const totalOutstanding = sumOutstandingDebt(customerScopedDebts);
    const debtorCount = countDebtorCustomers(customerScopedDebts);
    const dueThisWeek = countDebtsDueThisWeek(customerScopedDebts);
    const totalPaid = debts
      .filter((d) => d.status === "PAID")
      .reduce((sum, d) => sum + d.totalAmount, 0);

    return { totalOutstanding, debtorCount, dueThisWeek, totalPaid };
  }, [customerScopedDebts, debts]);

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

  // Handle single debt payment from table modal
  function openPayModal(debt: Debt) {
    setPayModalDebt(debt);
    setPaymentAmountInput(String(debt.remainingAmount));
    setPaymentMethod("CASH");
    setPaymentNote("");
  }

  function handleSubmitSinglePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payModalDebt) return;

    const amount = parsePaymentInput(paymentAmountInput);
    if (amount <= 0) {
      showToast("Nominal pembayaran harus lebih dari 0.", "error");
      return;
    }
    if (amount > payModalDebt.remainingAmount) {
      showToast(
        `Nominal melebihi sisa utang (${formatRupiah(payModalDebt.remainingAmount)}).`,
        "error",
      );
      return;
    }

    const methodLabel = paymentMethod === "CASH" ? "Tunai" : paymentMethod === "QRIS" ? "QRIS" : "Transfer";
    const fullNote = paymentNote.trim() ? `[${methodLabel}] ${paymentNote.trim()}` : `[${methodLabel}] Pembayaran utang`;

    payDebt(payModalDebt.id, amount, fullNote);

    const receiptId = generateDebtReceiptId();
    const now = new Date().toISOString();

    const cashInTx: Transaction = {
      id: receiptId,
      timestamp: now,
      type: "RETAIL",
      items: [
        {
          productId: "DEBT-PAY",
          productName: `Pembayaran Utang — ${payModalDebt.customerName}`,
          quantity: 1,
          unitPrice: amount,
        },
      ],
      totalHarga: amount,
      nominalBayar: amount,
      kembalian: 0,
      paymentMethod,
      customerId: payModalDebt.customerId,
      customerName: payModalDebt.customerName,
      customerPhone: payModalDebt.customerPhone,
    };
    addTransaction(cashInTx);

    const receipt: DebtPaymentReceipt = {
      id: receiptId,
      timestamp: now,
      customerId: payModalDebt.customerId,
      customerName: payModalDebt.customerName,
      customerPhone: payModalDebt.customerPhone,
      paymentAmount: amount,
      paymentMethod,
      note: paymentNote.trim() || undefined,
      remainingAfter: Math.max(0, payModalDebt.remainingAmount - amount),
      debtIds: [payModalDebt.id],
    };

    setDebtReceipt(receipt);
    setPayModalDebt(null);
    showToast(`Pembayaran utang ${formatRupiah(amount)} berhasil dicatat!`, "success");
  }

  // Handle fast payment via KasirDebtPaymentPanel
  function handlePayDebtFromPanel(payload: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    openDebts: Debt[];
    paymentAmount: number;
    paymentMethod: DebtSettlementMethod;
    note?: string;
  }): DebtPaymentReceipt | null {
    const {
      customerId,
      customerName,
      customerPhone,
      openDebts,
      paymentAmount,
      paymentMethod: method,
      note,
    } = payload;

    if (paymentAmount <= 0) {
      showToast("Nominal pembayaran harus lebih dari 0.", "error");
      return null;
    }

    const totalRemaining = openDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    if (paymentAmount > totalRemaining) {
      showToast(`Nominal melebihi sisa utang (${formatRupiah(totalRemaining)}).`, "error");
      return null;
    }

    const sorted = [...openDebts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let leftover = paymentAmount;
    const paidDebtIds: string[] = [];
    const methodLabel = method === "CASH" ? "Tunai" : method === "QRIS" ? "QRIS" : "Transfer";
    const noteText = note ? `[${methodLabel}] ${note}` : `[${methodLabel}] Pembayaran utang kasir`;

    for (const debt of sorted) {
      if (leftover <= 0) break;
      const apply = Math.min(leftover, debt.remainingAmount);
      if (apply <= 0) continue;
      payDebt(debt.id, apply, noteText);
      paidDebtIds.push(debt.id);
      leftover -= apply;
    }

    const remainingAfter = Math.max(0, totalRemaining - paymentAmount);
    const now = new Date().toISOString();
    const receiptId = generateDebtReceiptId();

    const cashInTransaction: Transaction = {
      id: receiptId,
      timestamp: now,
      type: "RETAIL",
      items: [
        {
          productId: "DEBT-PAY",
          productName: `Pembayaran Utang — ${customerName}`,
          quantity: 1,
          unitPrice: paymentAmount,
        },
      ],
      totalHarga: paymentAmount,
      nominalBayar: paymentAmount,
      kembalian: 0,
      paymentMethod: method,
      customerId,
      customerName,
      customerPhone,
    };
    addTransaction(cashInTransaction);

    const receipt: DebtPaymentReceipt = {
      id: receiptId,
      timestamp: now,
      customerId,
      customerName,
      customerPhone,
      paymentAmount,
      paymentMethod: method,
      note,
      remainingAfter,
      debtIds: paidDebtIds,
    };

    setDebtReceipt(receipt);
    showToast(`Pelunasan utang ${formatRupiah(paymentAmount)} berhasil dicatat!`, "success");
    return receipt;
  }

  // Handle Manual Debt Submission
  function handleManualDebtSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parsePaymentInput(manualAmountInput);
    if (!manualCustomerName.trim()) {
      showToast("Nama pelanggan wajib diisi.", "error");
      return;
    }
    if (amount <= 0) {
      showToast("Nominal utang harus lebih besar dari 0.", "error");
      return;
    }
    if (!manualDueDate) {
      showToast("Tanggal jatuh tempo wajib diisi.", "error");
      return;
    }

    const invoiceNo = `INV-MANUAL-${Date.now()}`;
    const newDebt = buildDebtFromInput(debts, {
      customerId: manualCustomerId || `CUST-${Date.now()}`,
      customerName: manualCustomerName.trim(),
      customerPhone: manualCustomerPhone.trim(),
      transactionId: invoiceNo,
      totalAmount: amount,
      paidAmount: 0,
      dueDate: manualDueDate,
      createdAt: new Date().toISOString(),
    });

    addDebt(newDebt);
    setManualDebtModalOpen(false);
    setManualCustomerName("");
    setManualCustomerPhone("");
    setManualCustomerId("");
    setManualAmountInput("");
    setManualNotes("");
    showToast("Utang baru berhasil dicatat!", "success");
  }

  const itemsModalTransaction = itemsModalDebt
    ? transactionById.get(itemsModalDebt.transactionId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 print:bg-white print:text-black">
      {/* Module Navigation Topbar */}
      <ModuleNav
        title="Pencatatan Utang / Piutang"
        subtitle="Modul Utang Pelanggan"
        rightContent={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {/* Sub Tabs */}
            <div className={TAB_GROUP_CLASS} role="tablist" aria-label="Tab Utang">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "list"}
                onClick={() => setActiveTab("list")}
                className={tabButtonClass(activeTab === "list", "amber")}
              >
                Daftar & Riwayat Piutang
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "quick-pay"}
                onClick={() => setActiveTab("quick-pay")}
                className={tabButtonClass(activeTab === "quick-pay", "amber")}
              >
                Pelunasan Cepat (Kasir)
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                + Pelanggan Baru
              </button>
              <button
                type="button"
                onClick={() => setManualDebtModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
              >
                + Catat Utang Manual
              </button>
            </div>
          </div>
        }
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Key Metrics Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
            <p className="text-xs font-medium text-amber-700">Total Piutang Berjalan</p>
            <p className="mt-1 text-2xl font-bold text-amber-900 truncate">
              {formatRupiah(stats.totalOutstanding)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Jumlah Debitur</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{stats.debtorCount} orang</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
            <p className="text-xs font-medium text-red-700">Jatuh Tempo Minggu Ini</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{stats.dueThisWeek} transaksi</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
            <p className="text-xs font-medium text-emerald-700">Total Piutang Terbayar</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900 truncate">
              {formatRupiah(stats.totalPaid)}
            </p>
          </div>
        </div>

        {/* TAB 1: DAFTAR & RIWAYAT PIUTANG */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari nama pelanggan, nomor HP, invoice/nota transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT_CLASS} w-full pl-9`}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className={SELECT_CLASS}
                  aria-label="Filter berdasarkan pelanggan"
                >
                  <option value="ALL">Semua Pelanggan ({uniqueCustomers.length})</option>
                  {uniqueCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DebtStatus | "ALL")}
                  className={SELECT_CLASS}
                  aria-label="Filter status utang"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="UNPAID">Belum Lunas</option>
                  <option value="PAID">Lunas</option>
                </select>
              </div>
            </div>

            {/* Debts Table */}
            <div className={TABLE_WRAPPER_CLASS}>
              <table className={TABLE_CLASS}>
                <thead className={TABLE_HEAD_CLASS}>
                  <tr>
                    <th className="px-4 py-3">Debitur</th>
                    <th className="px-4 py-3">Transaksi / Invoice</th>
                    <th className="px-4 py-3">Jatuh Tempo</th>
                    <th className="px-4 py-3">Total Utang</th>
                    <th className="px-4 py-3">Sisa Utang</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className={TABLE_BODY_CLASS}>
                  {filteredDebts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        {searchQuery || statusFilter !== "ALL" || selectedCustomer !== "ALL"
                          ? "Tidak ada data utang yang cocok dengan filter pencarian."
                          : "Belum ada catatan utang pelanggan. Utang otomatis tercatat saat kasir memilih metode TEMPO / KREDIT."}
                      </td>
                    </tr>
                  ) : (
                    filteredDebts.map((debt) => {
                      const isUnpaid = debt.status === "UNPAID";
                      const isOverdue =
                        isUnpaid && new Date(debt.dueDate).getTime() < Date.now();

                      return (
                        <tr key={debt.id} className={TABLE_ROW_CLASS}>
                          {/* Debitur */}
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{debt.customerName}</p>
                            <p className="text-xs text-slate-500">{debt.customerPhone}</p>
                          </td>

                          {/* Transaksi & Items */}
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-bold text-indigo-700">
                              {debt.transactionId}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatTimestamp(debt.createdAt)}
                            </p>
                            {transactionById.has(debt.transactionId) && (
                              <button
                                type="button"
                                onClick={() => setItemsModalDebt(debt)}
                                className="mt-1 inline-flex items-center text-[11px] font-semibold text-indigo-600 hover:underline"
                              >
                                Lihat Item Belanja ↗
                              </button>
                            )}
                          </td>

                          {/* Jatuh Tempo */}
                          <td className="px-4 py-3">
                            <p className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                              {formatDate(debt.dueDate)}
                            </p>
                            {isOverdue && (
                              <span className="inline-flex rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-700">
                                Terlambat
                              </span>
                            )}
                          </td>

                          {/* Total Utang */}
                          <td className="px-4 py-3">
                            <p className="text-xs text-slate-500">
                              {formatRupiah(debt.totalAmount)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Terbayar: {formatRupiah(debt.paidAmount)}
                            </p>
                          </td>

                          {/* Sisa Utang */}
                          <td className="px-4 py-3">
                            <p className={`text-sm font-bold ${isUnpaid ? "text-amber-700" : "text-slate-500"}`}>
                              {formatRupiah(debt.remainingAmount)}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                debt.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {debt.status === "PAID" ? "Lunas" : "Belum Lunas"}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isUnpaid && (
                                <button
                                  type="button"
                                  onClick={() => openPayModal(debt)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                                >
                                  Bayar
                                </button>
                              )}
                              {debt.paymentHistory && debt.paymentHistory.length > 0 && (
                                <span
                                  title={`${debt.paymentHistory.length} riwayat cicilan`}
                                  className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                                >
                                  {debt.paymentHistory.length}x Cicilan
                                </span>
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
        )}

        {/* TAB 2: PELUNASAN CEPAT (KASIR PANEL) */}
        {activeTab === "quick-pay" && (
          <div className="space-y-4">
            <KasirDebtPaymentPanel
              debts={debts}
              customers={customers}
              onPay={handlePayDebtFromPanel}
            />
          </div>
        )}
      </main>

      {/* MODAL BAYAR UTANG TUNGGAL (TABLE MODAL) */}
      {payModalDebt && (
        <div className={MODAL_OVERLAY}>
          <div className={`${MODAL_PANEL} max-w-md`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Pembayaran Piutang
                </p>
                <h3 className="text-base font-bold text-slate-800">
                  {payModalDebt.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayModalDebt(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSinglePayment} className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-mono font-bold text-slate-800">{payModalDebt.transactionId}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Sisa Tagihan:</span>
                  <span className="font-bold text-amber-700">{formatRupiah(payModalDebt.remainingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Metode Pembayaran</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["CASH", "TRANSFER", "QRIS"] as DebtSettlementMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
                        paymentMethod === m
                          ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m === "CASH" ? "TUNAI" : m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Nominal Pembayaran (Rp) <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className={`${INPUT_CLASS} w-full mt-1 font-mono font-bold text-base`}
                    autoFocus
                    required
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPaymentAmountInput(String(payModalDebt.remainingAmount))}
                  className="mt-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Bayar Lunas ({formatRupiah(payModalDebt.remainingAmount)})
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Catatan Pembayaran (Opsional)
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Cicilan ke-1 tunai di toko"
                    className={`${INPUT_CLASS} w-full mt-1`}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalDebt(null)}
                  className={BTN_SECONDARY}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                >
                  Simpan Pembayaran & Cetak Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT ITEM BELANJA TRANSAKSI */}
      {itemsModalDebt && itemsModalTransaction && (
        <div className={MODAL_OVERLAY}>
          <div className={`${MODAL_PANEL} max-w-lg`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Rincian Transaksi
                </p>
                <h3 className="text-base font-bold text-slate-800">
                  Invoice {itemsModalDebt.transactionId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemsModalDebt(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Pelanggan: <strong>{itemsModalDebt.customerName}</strong></span>
                <span>Tanggal: <strong>{formatDate(itemsModalTransaction.timestamp)}</strong></span>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Harga</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsModalTransaction.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium text-slate-800">{item.productName}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatRupiah(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800">
                          {formatRupiah(getTransactionItemSubtotal(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Transaksi:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(itemsModalTransaction.totalHarga)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Uang Muka (DP):</span>
                  <span className="font-semibold text-emerald-700">{formatRupiah(itemsModalTransaction.nominalBayar)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-1">
                  <span className="font-bold text-amber-800">Sisa Utang:</span>
                  <span className="font-bold text-amber-800">{formatRupiah(itemsModalDebt.remainingAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setItemsModalDebt(null)}
                className={BTN_PRIMARY}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATAT UTANG MANUAL */}
      {manualDebtModalOpen && (
        <div className={MODAL_OVERLAY}>
          <div className={`${MODAL_PANEL} max-w-lg`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Input Utang
                </p>
                <h3 className="text-base font-bold text-slate-800">Catat Utang Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setManualDebtModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualDebtSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Pilih Pelanggan Terdaftar</label>
                <select
                  value={manualCustomerId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setManualCustomerId(id);
                    const found = customers.find((c) => c.id === id);
                    if (found) {
                      setManualCustomerName(found.name);
                      setManualCustomerPhone(found.phone);
                    }
                  }}
                  className={`${SELECT_CLASS} w-full mt-1`}
                >
                  <option value="">-- Ketik manual atau pilih pelanggan --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Nama Pelanggan <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    placeholder="Nama pelanggan"
                    className={`${INPUT_CLASS} w-full mt-1`}
                    required
                  />
                </label>

                <label className="text-xs font-medium text-slate-700">
                  No. Telepon / WhatsApp
                  <input
                    type="tel"
                    value={manualCustomerPhone}
                    onChange={(e) => setManualCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className={`${INPUT_CLASS} w-full mt-1`}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Nominal Utang (Rp) <span className="text-red-500">*</span>
                  <input
                    type="text"
                    value={manualAmountInput}
                    onChange={(e) => setManualAmountInput(e.target.value)}
                    placeholder="e.g. 500000"
                    className={`${INPUT_CLASS} w-full mt-1 font-mono font-bold`}
                    required
                  />
                </label>

                <label className="text-xs font-medium text-slate-700">
                  Tanggal Jatuh Tempo <span className="text-red-500">*</span>
                  <input
                    type="date"
                    value={manualDueDate}
                    onChange={(e) => setManualDueDate(e.target.value)}
                    className={`${INPUT_CLASS} w-full mt-1`}
                    required
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Keterangan / Catatan
                  <textarea
                    rows={2}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Alasan utang atau nomor referensi nota lama..."
                    className={`${INPUT_CLASS} w-full mt-1`}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualDebtModalOpen(false)}
                  className={BTN_SECONDARY}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700"
                >
                  Simpan Utang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP BUKTI PEMBAYARAN UTANG (RECEIPT MODAL) */}
      {debtReceipt && (
        <DebtPaymentReceiptModal
          receipt={debtReceipt}
          onClose={() => setDebtReceipt(null)}
        />
      )}

      {/* MODAL TAMBAH PELANGGAN */}
      <CustomerFormModal
        open={customerModalOpen}
        title="Tambah Pelanggan Baru"
        submitLabel="Simpan Pelanggan"
        onClose={() => setCustomerModalOpen(false)}
        onSubmit={async (input) => {
          const created = await addCustomer(input);
          setManualCustomerId(created.id);
          setManualCustomerName(created.name);
          setManualCustomerPhone(created.phone);
          showToast(`Pelanggan "${created.name}" berhasil ditambahkan.`, "success");
        }}
      />
    </div>
  );
}
