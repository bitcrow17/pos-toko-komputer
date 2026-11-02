"use client";

import { STORE_INFO } from "@/lib/store-config";
import type { DebtPaymentReceipt } from "@/types/debt-payment";
import type { ReceiptLayout } from "./ReceiptPrintBar";

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

const METHOD_LABEL: Record<DebtPaymentReceipt["paymentMethod"], string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
};

interface DebtPaymentReceiptDocumentProps {
  receipt: DebtPaymentReceipt;
  layout: ReceiptLayout;
  className?: string;
}

export default function DebtPaymentReceiptDocument({
  receipt,
  layout,
  className = "",
}: DebtPaymentReceiptDocumentProps) {
  const isThermal = layout === "thermal";
  const isDigital = layout === "digital";
  const isCompact = isThermal || isDigital;
  const isPaid = receipt.remainingAfter <= 0;

  return (
    <article
      className={`receipt-print-area bg-white text-slate-900 ${className}`}
      aria-label="Struk pembayaran utang"
    >
      <header
        className={`text-center ${isCompact ? "px-3 py-3" : "px-8 py-6"}`}
      >
        <p
          className={`receipt-store-name font-extrabold uppercase tracking-widest text-slate-900 ${
            isCompact ? "text-base" : "text-lg"
          }`}
        >
          {STORE_INFO.name}
        </p>
        <p
          className={`mt-1 text-slate-600 ${isCompact ? "text-[10px] leading-tight" : "text-sm"}`}
        >
          {STORE_INFO.address}
        </p>
        <p
          className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
        >
          Telp: {STORE_INFO.phoneNumber}
        </p>

        <div
          className={`border-dashed border-slate-300 ${isCompact ? "my-2 border-t" : "my-4 border-t-2"}`}
        />

        <h2
          className={`font-extrabold text-slate-900 ${isCompact ? "text-sm" : "text-xl"}`}
        >
          {isCompact ? "BUKTI BAYAR UTANG" : "BUKTI PEMBAYARAN UTANG"}
        </h2>
        {isDigital && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Nota Digital
          </p>
        )}
        <p
          className={`receipt-ticket-no mt-1 font-mono font-extrabold text-slate-900 ${isCompact ? "text-sm" : "text-base"}`}
        >
          {receipt.id}
        </p>
        <p
          className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-sm"}`}
        >
          {formatTimestamp(receipt.timestamp)}
        </p>
      </header>

      <div className={isCompact ? "px-3" : "px-8"}>
        <dl className={`space-y-1.5 ${isCompact ? "text-[10px]" : "text-sm"}`}>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Pelanggan</dt>
            <dd className="receipt-customer-name text-right font-extrabold text-slate-900">
              {receipt.customerName}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">No. HP</dt>
            <dd className="text-right tabular-nums text-slate-700">
              {receipt.customerPhone || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Metode</dt>
            <dd className="text-right text-slate-700">
              {METHOD_LABEL[receipt.paymentMethod]}
            </dd>
          </div>
          {receipt.note ? (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Keterangan</dt>
              <dd className="text-right text-slate-700">{receipt.note}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <footer
        className={`border-dashed border-slate-300 ${isCompact ? "mx-3 mt-2 border-t px-0 py-2" : "mx-8 mt-4 border-t-2 px-0 py-4"}`}
      >
        <dl className={`space-y-1 ${isCompact ? "text-[10px]" : "text-sm"}`}>
          <div className="receipt-total flex justify-between">
            <dt className="font-extrabold text-slate-900">Nominal Dibayar</dt>
            <dd className="tabular-nums font-extrabold text-emerald-700">
              {formatRupiah(receipt.paymentAmount)}
            </dd>
          </div>
          <div
            className={`flex justify-between font-semibold ${
              isPaid ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            <dt>Status Utang</dt>
            <dd>
              {isPaid
                ? "LUNAS"
                : `SISA ${formatRupiah(receipt.remainingAfter)}`}
            </dd>
          </div>
          {!isPaid && (
            <div className="flex justify-between text-amber-800">
              <dt>Sisa Utang Setelah Bayar</dt>
              <dd className="tabular-nums font-bold">
                {formatRupiah(receipt.remainingAfter)}
              </dd>
            </div>
          )}
        </dl>

        <p
          className={`mt-3 text-center text-slate-500 ${isCompact ? "text-[9px]" : "text-xs"}`}
        >
          Terima kasih atas pembayaran Anda
        </p>
      </footer>
    </article>
  );
}
