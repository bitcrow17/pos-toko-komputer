"use client";

import { getTransactionItemSubtotal } from "@/lib/transaction";
import { STORE_INFO } from "@/lib/store-config";
import type { Transaction } from "@/types/transaction";
import type { Debt } from "@/types/debt";
import type { ReceiptLayout } from "./ReceiptModal";

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

interface ReceiptDocumentProps {
  transaction: Transaction;
  layout: ReceiptLayout;
  debt?: Pick<Debt, "remainingAmount" | "dueDate" | "status"> | null;
  className?: string;
}

function formatDateOnly(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

export default function ReceiptDocument({
  transaction,
  layout,
  debt = null,
  className = "",
}: ReceiptDocumentProps) {
  const isThermal = layout === "thermal";
  const isCredit = transaction.paymentMethod === "CREDIT";
  const remainingAmount =
    debt?.remainingAmount ??
    (isCredit
      ? Math.max(0, transaction.totalHarga - transaction.nominalBayar)
      : 0);
  const isPaid = isCredit ? remainingAmount <= 0 : true;

  return (
    <article
      className={`receipt-print-area bg-white text-slate-900 ${className}`}
      aria-label="Struk belanja"
    >
      <header
        className={`text-center ${isThermal ? "px-3 py-3" : "px-8 py-6"}`}
      >
        <p
          className={`font-bold uppercase tracking-widest text-slate-800 ${
            isThermal ? "text-[11px]" : "text-sm"
          }`}
        >
          {STORE_INFO.name}
        </p>
        <p
          className={`mt-1 text-slate-600 ${isThermal ? "text-[10px] leading-tight" : "text-sm"}`}
        >
          {STORE_INFO.address}
        </p>
        <p
          className={`text-slate-500 ${isThermal ? "text-[10px]" : "text-xs"}`}
        >
          Telp: {STORE_INFO.phoneNumber}
        </p>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-2 border-t" : "my-4 border-t-2"}`}
        />

        <h2
          className={`font-bold text-slate-900 ${isThermal ? "text-sm" : "text-xl"}`}
        >
          {isThermal ? "STRUK BELANJA" : "FAKTUR / NOTA PENJUALAN"}
        </h2>
        <p
          className={`mt-1 font-mono text-slate-700 ${isThermal ? "text-[11px]" : "text-sm"}`}
        >
          {transaction.id}
        </p>
        <p
          className={`text-slate-500 ${isThermal ? "text-[10px]" : "text-sm"}`}
        >
          {formatTimestamp(transaction.timestamp)}
        </p>
        {isCredit && transaction.customerName && (
          <p
            className={`mt-1 text-slate-600 ${isThermal ? "text-[10px]" : "text-xs"}`}
          >
            Pelanggan: {transaction.customerName}
            {transaction.customerPhone ? ` · ${transaction.customerPhone}` : ""}
          </p>
        )}
      </header>

      <div className={isThermal ? "px-3" : "px-8"}>
        <table
          className={`w-full border-collapse ${isThermal ? "text-[10px]" : "text-sm"}`}
        >
          <thead>
            <tr
              className={`border-b border-slate-300 text-left uppercase text-slate-500 ${
                isThermal ? "text-[9px]" : "text-xs"
              }`}
            >
              <th className={`${isThermal ? "pb-1 pr-1" : "pb-2 pr-2"}`}>
                Nama
              </th>
              <th
                className={`text-center ${isThermal ? "pb-1 px-1" : "pb-2 px-2"}`}
              >
                Qty
              </th>
              <th
                className={`text-right ${isThermal ? "pb-1 px-1" : "pb-2 px-2"}`}
              >
                Harga
              </th>
              <th
                className={`text-right ${isThermal ? "pb-1 pl-1" : "pb-2 pl-2"}`}
              >
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {transaction.items.map((item) => (
              <tr
                key={`${item.productId}-${item.unitPrice}`}
                className="border-b border-slate-100"
              >
                <td
                  className={`font-medium ${isThermal ? "py-1 pr-1" : "py-2 pr-2"}`}
                >
                  {item.productName}
                </td>
                <td
                  className={`text-center tabular-nums ${isThermal ? "py-1 px-1" : "py-2 px-2"}`}
                >
                  {item.quantity}
                </td>
                <td
                  className={`text-right tabular-nums text-slate-600 ${isThermal ? "py-1 px-1" : "py-2 px-2"}`}
                >
                  {formatRupiah(item.unitPrice)}
                </td>
                <td
                  className={`text-right tabular-nums font-medium ${isThermal ? "py-1 pl-1" : "py-2 pl-2"}`}
                >
                  {formatRupiah(getTransactionItemSubtotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer
        className={`border-dashed border-slate-300 ${isThermal ? "mx-3 mt-2 border-t px-0 py-2" : "mx-8 mt-4 border-t-2 px-0 py-4"}`}
      >
        <dl
          className={`space-y-1 ${isThermal ? "text-[10px]" : "text-sm"}`}
        >
          <div className="flex justify-between">
            <dt className="font-semibold text-slate-700">Total Belanja</dt>
            <dd className="tabular-nums font-bold">
              {formatRupiah(transaction.totalHarga)}
            </dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Nominal Bayar</dt>
            <dd className="tabular-nums">
              {formatRupiah(transaction.nominalBayar)}
            </dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Kembalian</dt>
            <dd className="tabular-nums">
              {formatRupiah(transaction.kembalian)}
            </dd>
          </div>
          <div
            className={`flex justify-between font-semibold ${
              isPaid ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            <dt>Status Pembayaran</dt>
            <dd>{isCredit ? (isPaid ? "LUNAS" : "UTANG (TEMPO)") : "LUNAS"}</dd>
          </div>
          {isCredit && !isPaid && (
            <>
              <div className="flex justify-between text-amber-800">
                <dt>Sisa Utang</dt>
                <dd className="tabular-nums font-bold">
                  {formatRupiah(remainingAmount)}
                </dd>
              </div>
              {(debt?.dueDate || transaction.timestamp) && (
                <div className="flex justify-between text-slate-600">
                  <dt>Jatuh Tempo</dt>
                  <dd className="tabular-nums">
                    {formatDateOnly(debt?.dueDate ?? transaction.timestamp)}
                  </dd>
                </div>
              )}
            </>
          )}
        </dl>

        <p
          className={`mt-3 text-center text-slate-500 ${isThermal ? "text-[9px]" : "text-xs"}`}
        >
          Terima kasih atas kunjungan Anda
        </p>
      </footer>
    </article>
  );
}
