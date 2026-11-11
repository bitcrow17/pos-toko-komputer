"use client";

import { useStoreSettings } from "@/src/context/StoreSettingsContext";
import type { ServiceTicket } from "@/types/service";
import type { Transaction } from "@/types/transaction";
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

const METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  CREDIT: "Tempo",
};

interface ServicePickupReceiptDocumentProps {
  transaction: Transaction;
  ticket: ServiceTicket;
  layout: ReceiptLayout;
  className?: string;
}

export default function ServicePickupReceiptDocument({
  transaction,
  ticket,
  layout,
  className = "",
}: ServicePickupReceiptDocumentProps) {
  const { settings: store } = useStoreSettings();
  const isThermal = layout === "thermal";
  const isDigital = layout === "digital";
  const isCompact = isThermal || isDigital;

  return (
    <article
      className={`receipt-print-area bg-white text-slate-900 ${className}`}
      aria-label="Struk pengambilan servis"
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
          className={`mt-1 text-slate-600 ${isCompact ? "text-[10px] leading-tight" : "text-sm"}`}
        >
          {store.address}
        </p>
        <p
          className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
        >
          Telp: {store.phoneNumber}
        </p>

        <div
          className={`border-dashed border-slate-300 ${isCompact ? "my-2 border-t" : "my-4 border-t-2"}`}
        />

        <h2
          className={`font-extrabold text-slate-900 ${isCompact ? "text-sm" : "text-xl"}`}
        >
          {ticket.isComplaint
            ? "STRUK AMBIL UNIT KOMPLAIN"
            : "STRUK PENGAMBILAN SERVIS"}
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
          className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
        >
          {formatTimestamp(transaction.timestamp)}
        </p>
        {ticket.isComplaint && (
          <p
            className={`mt-2 font-semibold text-red-700 ${isCompact ? "text-[10px]" : "text-xs"}`}
          >
            UNIT KOMPLAIN / GARANSI — TANPA ONGKOS
          </p>
        )}
      </header>

      <section
        className={isCompact ? "px-3 pb-3 text-[11px]" : "px-8 pb-6 text-sm"}
      >
        <div className="space-y-2">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">No. Tiket</span>
            <span className="receipt-ticket-no font-mono font-extrabold">
              {ticket.ticketNo}
            </span>
          </div>
          {ticket.originalTicketNo && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Tiket Lama</span>
              <span className="font-mono">{ticket.originalTicketNo}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Pelanggan</span>
            <span className="receipt-customer-name text-right font-extrabold">
              {ticket.customerName}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">HP</span>
            <span>{ticket.customerPhone}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Perangkat</span>
            <span className="max-w-[55%] text-right">{ticket.deviceName}</span>
          </div>
          {ticket.serialNumber && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Serial</span>
              <span className="font-mono">{ticket.serialNumber}</span>
            </div>
          )}
        </div>

        <div
          className={`border-dashed border-slate-300 ${isCompact ? "my-3 border-t" : "my-5 border-t-2"}`}
        />

        <div className="space-y-1">
          <div className="receipt-total flex justify-between font-extrabold">
            <span>Biaya Servis</span>
            <span>{formatRupiah(transaction.totalHarga)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>
              Bayar (
              {METHOD_LABEL[transaction.paymentMethod ?? "CASH"] ?? "Tunai"})
            </span>
            <span>{formatRupiah(transaction.nominalBayar)}</span>
          </div>
          {transaction.kembalian > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Kembalian</span>
              <span>{formatRupiah(transaction.kembalian)}</span>
            </div>
          )}
        </div>

        <div
          className={`border-dashed border-slate-300 ${isCompact ? "my-3 border-t" : "my-5 border-t-2"}`}
        />

        <p
          className={`text-center text-slate-500 ${isCompact ? "text-[9px]" : "text-[11px]"}`}
        >
          Unit telah diambil pelanggan. Simpan struk ini sebagai bukti
          pengambilan.
        </p>
      </section>
    </article>
  );
}
