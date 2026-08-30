"use client";

import { useMemo, useState } from "react";
import {
  getTransactionItemCount,
  getTransactionType,
  summarizeCashByType,
} from "@/lib/transaction";
import {
  BTN_PRIMARY,
  INPUT_CLASS,
  MODE_BADGE,
  PAGE_WRAPPER,
  STAT_CARD,
  TAB_GROUP_CLASS,
  TABLE_BODY_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
  TABLE_WRAPPER_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";
import ReceiptModal from "@/src/components/ReceiptModal";
import PageHeader from "@/src/components/ui/PageHeader";
import type { Transaction, TransactionType } from "@/types/transaction";

type TimeFilter =
  | "hari-ini"
  | "minggu-ini"
  | "bulan-ini"
  | "semua"
  | "kustom";

type TypeFilter = "ALL" | TransactionType;

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "hari-ini", label: "Hari Ini" },
  { value: "minggu-ini", label: "Minggu Ini" },
  { value: "bulan-ini", label: "Bulan Ini" },
  { value: "semua", label: "Semua" },
  { value: "kustom", label: "Kustom" },
];

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "Semua Transaksi" },
  { value: "RETAIL", label: "Penjualan Retail" },
  { value: "SERVICE", label: "Pendapatan Servis" },
];

const DATE_INPUT_CLASS = INPUT_CLASS;

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function toLocalDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameLocalMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isWithinLast7Days(txDate: Date, now: Date): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const txDay = new Date(
    txDate.getFullYear(),
    txDate.getMonth(),
    txDate.getDate(),
  );
  return txDay >= start;
}

function isWithinCustomRange(
  txDate: Date,
  startInput: string,
  endInput: string,
): boolean {
  const start = parseDateInput(startInput);
  const end = parseDateInput(endInput);
  if (!start || !end) return false;

  const txDay = toLocalDateOnly(txDate);
  const startDay = toLocalDateOnly(start);
  const endDay = toLocalDateOnly(end);
  const rangeStart = startDay <= endDay ? startDay : endDay;
  const rangeEnd = startDay <= endDay ? endDay : startDay;

  return txDay >= rangeStart && txDay <= rangeEnd;
}

function matchesTimeFilter(
  timestamp: string,
  filter: TimeFilter,
  options: {
    now?: Date;
    customStart?: string;
    customEnd?: string;
  } = {},
): boolean {
  const now = options.now ?? new Date();
  if (filter === "semua") return true;

  const txDate = new Date(timestamp);
  if (Number.isNaN(txDate.getTime())) return false;

  switch (filter) {
    case "hari-ini":
      return isSameLocalDay(txDate, now);
    case "minggu-ini":
      return isWithinLast7Days(txDate, now);
    case "bulan-ini":
      return isSameLocalMonth(txDate, now);
    case "kustom":
      return isWithinCustomRange(
        txDate,
        options.customStart ?? "",
        options.customEnd ?? "",
      );
    default:
      return true;
  }
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default function AdminTransaksiPage() {
  const { transactions, debts } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("hari-ini");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [customStartDate, setCustomStartDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [customEndDate, setCustomEndDate] = useState(() =>
    formatDateInput(new Date()),
  );
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  function handleTimeFilterChange(next: TimeFilter) {
    setTimeFilter(next);
    if (next === "kustom") {
      const today = formatDateInput(new Date());
      setCustomStartDate(today);
      setCustomEndDate(today);
    }
  }

  const timeScopedTransactions = useMemo(() => {
    return transactions.filter((tx) =>
      matchesTimeFilter(tx.timestamp, timeFilter, {
        customStart: customStartDate,
        customEnd: customEndDate,
      }),
    );
  }, [transactions, timeFilter, customStartDate, customEndDate]);

  const cashSummary = useMemo(
    () => summarizeCashByType(timeScopedTransactions),
    [timeScopedTransactions],
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timeScopedTransactions.filter((tx) => {
      if (typeFilter !== "ALL" && getTransactionType(tx) !== typeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        tx.id.toLowerCase().includes(q) ||
        (tx.serviceTicketNo?.toLowerCase().includes(q) ?? false) ||
        (tx.customerName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [timeScopedTransactions, searchQuery, typeFilter]);

  const filteredSummary = useMemo(
    () => ({
      totalNota: filteredTransactions.length,
      totalPendapatan: filteredTransactions.reduce(
        (sum, tx) => sum + tx.totalHarga,
        0,
      ),
    }),
    [filteredTransactions],
  );

  return (
    <>
      <div className={PAGE_WRAPPER}>
        <PageHeader
          title="Laporan & Riwayat Transaksi"
          subtitle="Pemisahan kas Retail vs Servis agar cocok dengan uang fisik di laci."
        />

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block text-sm font-medium text-slate-600">
            Cari Nomor Nota / Tiket / Pelanggan
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="INV-… / SVC-PAY-… / nama"
              className={`${INPUT_CLASS} mt-1.5 max-w-md`}
            />
          </label>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className={TAB_GROUP_CLASS} role="group" aria-label="Filter rentang waktu">
              {TIME_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTimeFilterChange(option.value)}
                  aria-pressed={timeFilter === option.value}
                  className={tabButtonClass(timeFilter === option.value, "indigo")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {timeFilter === "kustom" && (
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <label className="text-xs font-medium text-slate-600">
                  Tanggal Mulai
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`${DATE_INPUT_CLASS} mt-1 block`}
                  />
                </label>
                <span className="hidden pb-2 text-slate-400 sm:inline" aria-hidden>
                  —
                </span>
                <label className="text-xs font-medium text-slate-600">
                  Tanggal Selesai
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`${DATE_INPUT_CLASS} mt-1 block`}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className={`mb-6 ${TAB_GROUP_CLASS}`} role="tablist" aria-label="Filter kategori transaksi">
          {TYPE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={typeFilter === option.value}
              onClick={() => setTypeFilter(option.value)}
              className={tabButtonClass(
                typeFilter === option.value,
                option.value === "SERVICE" ? "violet" : "indigo",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className={`${STAT_CARD} border-indigo-200`}>
            <p className="text-sm text-slate-500">Total Kas Retail</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-700">
              {formatRupiah(cashSummary.retailCash)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Uang masuk penjualan barang (sesuai laci)
            </p>
          </article>
          <article className={`${STAT_CARD} border-violet-200`}>
            <p className="text-sm text-slate-500">Total Kas Servis</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-700">
              {formatRupiah(cashSummary.serviceCash)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Omset pelunasan pengambilan</p>
          </article>
          <article className={`${STAT_CARD} border-amber-200`}>
            <p className="text-sm text-slate-500">Modal / Ongkos Mitra</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">
              {formatRupiah(
                cashSummary.servicePartnerCost + cashSummary.serviceSparepartCost,
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Mitra {formatRupiah(cashSummary.servicePartnerCost)} · Sparepart{" "}
              {formatRupiah(cashSummary.serviceSparepartCost)}
            </p>
          </article>
          <article className={`${STAT_CARD} border-emerald-200`}>
            <p className="text-sm text-slate-500">Laba Bersih Servis</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
              {formatRupiah(cashSummary.serviceNetProfit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Omset − ongkos mitra − sparepart
            </p>
          </article>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <article className={STAT_CARD}>
            <p className="text-sm text-slate-500">Nota Terfilter</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">
              {filteredSummary.totalNota.toLocaleString("id-ID")}
            </p>
          </article>
          <article className={STAT_CARD}>
            <p className="text-sm text-slate-500">Nilai Nota Terfilter</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">
              {formatRupiah(filteredSummary.totalPendapatan)}
            </p>
          </article>
        </div>

        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-left text-sm">
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className="px-4 py-3">Nomor Nota</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Tanggal / Waktu</th>
                <th className="px-4 py-3 text-center">Item</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className={TABLE_BODY_CLASS}>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {transactions.length === 0
                        ? "Belum ada transaksi. Selesaikan pembayaran di Kasir untuk mencatat transaksi."
                        : "Tidak ada nota yang cocok dengan filter atau pencarian."}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const txType = getTransactionType(tx);
                    return (
                      <tr key={tx.id} className={TABLE_ROW_CLASS}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-indigo-700">{tx.id}</p>
                          {tx.serviceTicketNo && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Tiket {tx.serviceTicketNo}
                            </p>
                          )}
                          {tx.customerName && (
                            <p className="text-xs text-slate-500">{tx.customerName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                              txType === "SERVICE" ? MODE_BADGE.service : MODE_BADGE.retail
                            }`}
                          >
                            {txType === "SERVICE" ? "Servis" : "Retail"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatTimestamp(tx.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                          {getTransactionItemCount(tx)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                          {formatRupiah(tx.totalHarga)}
                          {txType === "SERVICE" && tx.serviceNetProfit != null && (
                            <p className="text-xs font-normal text-emerald-700">
                              Laba {formatRupiah(tx.serviceNetProfit)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(tx)}
                            className={`${BTN_PRIMARY} px-3 py-1.5 text-xs`}
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </div>
      </div>

      {selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          variant="detail"
          debt={
            selectedTransaction.debtId
              ? debts.find((d) => d.id === selectedTransaction.debtId) ?? null
              : null
          }
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
}
