"use client";

import { useMemo, useState } from "react";
import {
  getTransactionItemCount,
} from "@/lib/transaction";
import { useApp } from "@/src/context/AppContext";
import ReceiptModal from "@/src/components/ReceiptModal";
import type { Transaction } from "@/types/transaction";

type TimeFilter =
  | "hari-ini"
  | "minggu-ini"
  | "bulan-ini"
  | "semua"
  | "kustom";

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "hari-ini", label: "Hari Ini" },
  { value: "minggu-ini", label: "Minggu Ini" },
  { value: "bulan-ini", label: "Bulan Ini" },
  { value: "semua", label: "Semua" },
  { value: "kustom", label: "Kustom" },
];

const DATE_INPUT_CLASS =
  "rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 [color-scheme:dark]";

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

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (
        !matchesTimeFilter(tx.timestamp, timeFilter, {
          customStart: customStartDate,
          customEnd: customEndDate,
        })
      ) {
        return false;
      }
      if (!q) return true;
      return tx.id.toLowerCase().includes(q);
    });
  }, [transactions, searchQuery, timeFilter, customStartDate, customEndDate]);

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
    <div className="p-6 sm:p-8 print:hidden">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Riwayat Transaksi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Daftar transaksi yang sudah lunas dari Kasir.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block text-sm text-slate-400">
          Cari Nomor Nota
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Contoh: INV-20241103-001"
            className="mt-1.5 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </label>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div
            className="inline-flex flex-wrap rounded-lg border border-slate-700 bg-slate-900 p-1"
            role="group"
            aria-label="Filter rentang waktu"
          >
            {TIME_FILTER_OPTIONS.map((option) => {
              const active = timeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTimeFilterChange(option.value)}
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

          {timeFilter === "kustom" && (
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
              <label className="text-xs text-slate-400">
                Tanggal Mulai
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`${DATE_INPUT_CLASS} mt-1 block`}
                />
              </label>
              <span className="hidden pb-2 text-slate-600 sm:inline" aria-hidden>
                —
              </span>
              <label className="text-xs text-slate-400">
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Total Nota Terfilter</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {filteredSummary.totalNota.toLocaleString("id-ID")}
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Total Pendapatan Terfilter</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-300">
            {formatRupiah(filteredSummary.totalPendapatan)}
          </p>
        </article>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nomor Nota</th>
                <th className="px-4 py-3">Tanggal / Waktu</th>
                <th className="px-4 py-3 text-center">Total Item</th>
                <th className="px-4 py-3 text-right">Total Belanja</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {transactions.length === 0
                      ? "Belum ada transaksi. Selesaikan pembayaran di Kasir untuk mencatat transaksi."
                      : "Tidak ada nota yang cocok dengan filter atau pencarian."}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-800/80 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {tx.id}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-300">
                      {getTransactionItemCount(tx)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">
                      {formatRupiah(tx.totalHarga)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedTransaction(tx)}
                        className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-500"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
