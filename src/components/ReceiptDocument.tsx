"use client";

import { getTransactionItemSubtotal } from "@/lib/transaction";
import { useStoreSettings } from "@/src/context/StoreSettingsContext";
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
  const { settings: store } = useStoreSettings();
  const isThermal = layout === "thermal";
  const isDigital = layout === "digital";
  const isCompact = isThermal || isDigital;
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
        className={`text-center ${isCompact ? "px-3 py-3" : "px-8 py-6"}`}
      >
        {store.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logoDataUrl}
            alt="Logo Toko"
            className={`mx-auto object-contain ${isCompact ? "mb-1.5 h-10" : "mb-2 h-14"}`}
          />
        )}
        <p
          className={`receipt-store-name font-extrabold uppercase tracking-widest text-slate-900 ${
            isCompact ? "text-base" : "text-lg"
          }`}
        >
          {store.name}
        </p>
        <p
          className={`mt-1 text-slate-600 ${isCompact ? "text-[11px] leading-tight" : "text-sm"}`}
        >
          {store.address}
        </p>
        <p
          className={`text-slate-500 ${isCompact ? "text-[11px]" : "text-xs"}`}
        >
          Telp: {store.phoneNumber}
        </p>

        <div
          className={`border-dashed border-slate-300 ${isCompact ? "my-2 border-t" : "my-4 border-t-2"}`}
        />

        <h2
          className={`font-extrabold text-slate-900 ${isCompact ? "text-sm" : "text-xl"}`}
        >
          {isCompact ? "STRUK BELANJA" : "FAKTUR / NOTA PENJUALAN"}
        </h2>
        {isDigital && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Nota Digital
          </p>
        )}
        <p
          className={`receipt-ticket-no mt-1 font-mono font-extrabold text-slate-900 ${isCompact ? "text-sm" : "text-base"}`}
        >
          {transaction.id}
        </p>
        <p
          className={`text-slate-500 ${isCompact ? "text-[11px]" : "text-sm"}`}
        >
          {formatTimestamp(transaction.timestamp)}
        </p>
        {transaction.customerName && (
          <p
            className={`receipt-customer-name mt-1 font-extrabold text-slate-900 ${isCompact ? "text-sm" : "text-base"}`}
          >
            {transaction.customerName}
            {transaction.customerPhone ? ` · ${transaction.customerPhone}` : ""}
          </p>
        )}
      </header>

      <div className={isCompact ? "px-3" : "px-8"}>
        <table
          className={`w-full border-collapse ${isCompact ? "text-[12px]" : "text-sm"}`}
        >
          <thead>
            <tr
              className={`border-b border-slate-300 text-left uppercase text-slate-500 ${
                isCompact ? "text-[10px]" : "text-xs"
              }`}
            >
              <th className={`${isCompact ? "pb-1 pr-1" : "pb-2 pr-2"}`}>
                Nama
              </th>
              <th
                className={`text-center ${isCompact ? "pb-1 px-1" : "pb-2 px-2"}`}
              >
                Qty
              </th>
              <th
                className={`text-right ${isCompact ? "pb-1 px-1" : "pb-2 px-2"}`}
              >
                Harga
              </th>
              <th
                className={`text-right ${isCompact ? "pb-1 pl-1" : "pb-2 pl-2"}`}
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
                  className={`font-medium ${isCompact ? "py-1 pr-1" : "py-2 pr-2"}`}
                >
                  {item.productName}
                </td>
                <td
                  className={`text-center tabular-nums ${isCompact ? "py-1 px-1" : "py-2 px-2"}`}
                >
                  {item.quantity}
                </td>
                <td
                  className={`text-right tabular-nums text-slate-600 ${isCompact ? "py-1 px-1" : "py-2 px-2"}`}
                >
                  {formatRupiah(item.unitPrice)}
                </td>
                <td
                  className={`text-right tabular-nums font-medium ${isCompact ? "py-1 pl-1" : "py-2 pl-2"}`}
                >
                  {formatRupiah(getTransactionItemSubtotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer
        className={`border-dashed border-slate-300 ${isCompact ? "mx-3 mt-2 border-t px-0 py-2" : "mx-8 mt-4 border-t-2 px-0 py-4"}`}
      >
        <dl
          className={`space-y-1 ${isCompact ? "text-[12px]" : "text-sm"}`}
        >
          <div className="receipt-total flex justify-between">
            <dt className="font-extrabold text-slate-900">Total Belanja</dt>
            <dd className="tabular-nums font-extrabold">
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
          className={`mt-3 text-center text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
        >
          Terima kasih atas kunjungan Anda
        </p>
      </footer>
    </article>
  );
}
