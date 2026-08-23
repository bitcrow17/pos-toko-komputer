"use client";

import { useMemo, useState } from "react";
import { parseCashInput } from "@/lib/kasir-calculations";
import { sumOutstandingDebt } from "@/lib/debt";
import {
  BTN_PRIMARY,
  BTN_SUCCESS,
  INPUT_CLASS,
  TAB_GROUP_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import type { Debt } from "@/types/debt";
import type { Customer } from "@/types/customer";
import type {
  DebtPaymentReceipt,
  DebtSettlementMethod,
} from "@/types/debt-payment";

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

export interface DebtorOption {
  id: string;
  name: string;
  phone: string;
}

interface KasirDebtPaymentPanelProps {
  debts: Debt[];
  customers?: Customer[];
  onPay: (payload: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    openDebts: Debt[];
    paymentAmount: number;
    paymentMethod: DebtSettlementMethod;
    note?: string;
  }) => DebtPaymentReceipt | null;
}

const inputClass = INPUT_CLASS;

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

export default function KasirDebtPaymentPanel({
  debts,
  customers = [],
  onPay,
}: KasirDebtPaymentPanelProps) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<DebtSettlementMethod>("CASH");
  const [paymentNote, setPaymentNote] = useState("");

  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const openDebts = useMemo(
    () =>
      debts.filter(
        (d) =>
          (d.status === "UNPAID" || d.status === "PARTIAL") &&
          d.remainingAmount > 0,
      ),
    [debts],
  );

  const debtorOptions = useMemo(() => {
    const byId = new Map<string, DebtorOption>();
    for (const debt of openDebts) {
      if (!byId.has(debt.customerId)) {
        const master = customerById.get(debt.customerId);
        byId.set(debt.customerId, {
          id: debt.customerId,
          name: master?.name ?? debt.customerName,
          phone: master?.phone ?? debt.customerPhone,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "id", { sensitivity: "base" }),
    );
  }, [openDebts, customerById]);

  const filteredDebtors = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return debtorOptions;
    return debtorOptions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [customerQuery, debtorOptions]);

  const selectedCustomer =
    debtorOptions.find((c) => c.id === selectedCustomerId) ?? null;

  const customerOpenDebts = useMemo(() => {
    if (!selectedCustomerId) return [];
    return openDebts
      .filter((d) => d.customerId === selectedCustomerId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [openDebts, selectedCustomerId]);

  const totalRemaining = useMemo(
    () => sumOutstandingDebt(customerOpenDebts),
    [customerOpenDebts],
  );

  const paymentAmount = useMemo(
    () => parseCashInput(paymentAmountInput),
    [paymentAmountInput],
  );

  const canSubmit =
    Boolean(selectedCustomer) &&
    customerOpenDebts.length > 0 &&
    paymentAmount > 0 &&
    paymentAmount <= totalRemaining;

  function selectCustomer(id: string) {
    setSelectedCustomerId(id);
    setPaymentAmountInput("");
    setPaymentNote("");
    const match = debtorOptions.find((c) => c.id === id);
    if (match) setCustomerQuery(match.name);
  }

  function handleSubmit() {
    if (!selectedCustomer || !canSubmit) return;

    const receipt = onPay({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      openDebts: customerOpenDebts,
      paymentAmount,
      paymentMethod,
      note: paymentNote.trim() || undefined,
    });

    if (!receipt) return;

    setPaymentAmountInput("");
    setPaymentNote("");
    if (receipt.remainingAfter <= 0) {
      setSelectedCustomerId("");
      setCustomerQuery("");
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Pembayaran Utang Pelanggan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih pelanggan, cek sisa utang, lalu catat pembayaran cicilan
              atau pelunasan.
            </p>
          </div>

          <label className="block text-sm text-slate-400">
            Cari / Pilih Pelanggan
            <input
              type="search"
              className={`${inputClass} mt-1.5`}
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                setSelectedCustomerId("");
              }}
              placeholder="Ketik nama, HP, atau ID pelanggan…"
              autoComplete="off"
            />
          </label>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filteredDebtors.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                {openDebts.length === 0
                  ? "Tidak ada pelanggan dengan utang belum lunas."
                  : "Tidak ada pelanggan yang cocok dengan pencarian."}
              </p>
            ) : (
              <ul className="max-h-56 divide-y divide-slate-800 overflow-y-auto">
                {filteredDebtors.map((customer) => {
                  const active = customer.id === selectedCustomerId;
                  const remaining = sumOutstandingDebt(
                    openDebts.filter((d) => d.customerId === customer.id),
                  );
                  return (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => selectCustomer(customer.id)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                          active
                            ? "bg-indigo-50 text-indigo-900"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium text-slate-100">
                            {customer.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {customer.phone}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-300">
                          {formatRupiah(remaining)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedCustomer && (
            <article className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                Ringkasan Utang
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {selectedCustomer.name}
              </p>
              <p className="text-sm text-slate-400">{selectedCustomer.phone}</p>
              <p className="mt-3 text-sm text-slate-400">
                Total Sisa Utang{" "}
                <span className="ml-1 text-xl font-semibold tabular-nums text-amber-300">
                  {formatRupiah(totalRemaining)}
                </span>
              </p>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Nota</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOpenDebts.map((debt) => (
                      <tr
                        key={debt.id}
                        className="border-b border-slate-800/80"
                      >
                        <td className="px-3 py-2 text-slate-300">
                          {formatDate(debt.createdAt)}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">
                          {debt.transactionId}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                          {formatRupiah(debt.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-300">
                          {formatRupiah(debt.remainingAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </section>

        <aside className="sticky top-4 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Formulir Pembayaran
          </h3>

          {!selectedCustomer ? (
            <p className="mt-6 text-sm text-slate-500">
              Pilih pelanggan di sebelah kiri untuk mulai menerima pembayaran.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <label className="block text-xs text-slate-400">
                Nominal Pembayaran *
                <input
                  type="text"
                  inputMode="numeric"
                  className={`${inputClass} mt-1.5 tabular-nums`}
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  placeholder="0"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmountInput(String(totalRemaining))
                  }
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                >
                  Lunas Total
                </button>
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={amount > totalRemaining}
                    onClick={() => setPaymentAmountInput(String(amount))}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {formatRupiah(amount)}
                  </button>
                ))}
              </div>

              <fieldset>
                <legend className="mb-1.5 text-xs text-slate-400">
                  Metode Pembayaran *
                </legend>
                <div
                  className="inline-flex flex-wrap rounded-xl border border-slate-700 bg-slate-950 p-1"
                  role="group"
                >
                  {(
                    [
                      { value: "CASH", label: "Tunai" },
                      { value: "QRIS", label: "QRIS" },
                      { value: "TRANSFER", label: "Transfer" },
                    ] as const
                  ).map((option) => {
                    const active = paymentMethod === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPaymentMethod(option.value)}
                        aria-pressed={active}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          active
                            ? "bg-cyan-600 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block text-xs text-slate-400">
                Catatan / Keterangan (opsional)
                <input
                  type="text"
                  className={`${inputClass} mt-1.5`}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder='Misal: "Cicilan ke-2"'
                />
              </label>

              {paymentAmount > totalRemaining && (
                <p className="text-xs text-red-300" role="alert">
                  Nominal melebihi sisa utang (
                  {formatRupiah(totalRemaining)}).
                </p>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Sisa setelah bayar</span>
                  <span className="font-semibold tabular-nums text-amber-200">
                    {formatRupiah(
                      Math.max(0, totalRemaining - Math.max(0, paymentAmount)),
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`${BTN_SUCCESS} mt-2 w-full py-3.5`}
              >
                Proses Pembayaran Utang
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
