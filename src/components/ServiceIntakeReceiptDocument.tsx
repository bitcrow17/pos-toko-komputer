"use client";

import { STORE_INFO } from "@/lib/store-config";
import { formatServiceAccessoriesLabel } from "@/lib/service";
import type { ServiceTicket } from "@/types/service";
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

function formatDateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // YYYY-MM-DD tanpa timezone shift
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) {
      return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
        new Date(y, m - 1, d),
      );
    }
    return value;
  }
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

interface ServiceIntakeReceiptDocumentProps {
  ticket: ServiceTicket;
  layout: ReceiptLayout;
  className?: string;
}

export default function ServiceIntakeReceiptDocument({
  ticket,
  layout,
  className = "",
}: ServiceIntakeReceiptDocumentProps) {
  const isThermal = layout === "thermal";
  const textBase = isThermal ? "text-[11px]" : "text-sm";
  const textSmall = isThermal ? "text-[10px]" : "text-xs";
  const textTiny = isThermal ? "text-[9px]" : "text-[11px]";

  return (
    <article
      className={`receipt-print-area bg-white text-slate-900 ${className}`}
      aria-label="Tanda terima servis masuk"
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
        <p className={`text-slate-500 ${textSmall}`}>
          Telp: {STORE_INFO.phoneNumber} · WA: {STORE_INFO.whatsapp}
        </p>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-2 border-t" : "my-4 border-t-2"}`}
        />

        <h2
          className={`font-bold text-slate-900 ${isThermal ? "text-sm" : "text-xl"}`}
        >
          TANDA TERIMA SERVIS
        </h2>
        <p className={`mt-1 font-mono font-semibold text-slate-800 ${textBase}`}>
          {ticket.ticketNo}
        </p>
        <p className={`text-slate-500 ${textSmall}`}>
          Diterima: {formatTimestamp(ticket.createdAt)}
        </p>

        <p
          className={`mt-2 inline-block rounded border px-2 py-0.5 font-bold uppercase tracking-wide ${
            ticket.isComplaint
              ? "border-red-600 text-red-700"
              : "border-slate-700 text-slate-800"
          } ${textTiny}`}
        >
          {ticket.isComplaint ? "Garansi / Komplain" : "Servis Baru"}
        </p>
      </header>

      <section className={`${isThermal ? "px-3 pb-3" : "px-8 pb-6"} ${textBase}`}>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-slate-500">Pelanggan</span>
            <span className="text-right font-semibold">{ticket.customerName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-slate-500">No. HP</span>
            <span className="font-medium">{ticket.customerPhone}</span>
          </div>
        </div>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-2.5 border-t" : "my-4 border-t-2"}`}
        />

        <h3
          className={`mb-1.5 font-semibold uppercase tracking-wide text-slate-700 ${textTiny}`}
        >
          Detail Unit
        </h3>
        <div className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-slate-500">Perangkat</span>
            <span className="max-w-[60%] text-right font-medium">
              {ticket.deviceName}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-slate-500">No. Seri (SN)</span>
            <span className="font-mono">
              {ticket.serialNumber?.trim() || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="shrink-0 text-slate-500">Kelengkapan</span>
            <span className="max-w-[60%] text-right">
              {formatServiceAccessoriesLabel(ticket.accessories)}
            </span>
          </div>
        </div>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-2.5 border-t" : "my-4 border-t-2"}`}
        />

        <div>
          <p className={`text-slate-500 ${textSmall}`}>Keluhan / Diagnosa Awal</p>
          <p className="mt-1 whitespace-pre-wrap break-words font-medium leading-snug text-slate-900">
            {ticket.problem}
          </p>
        </div>

        {ticket.isComplaint && ticket.originalTicketNo && (
          <div className="mt-2 rounded border border-red-300 bg-red-50 px-2 py-1.5">
            <p className={`font-semibold text-red-800 ${textTiny}`}>
              Referensi tiket lama: {ticket.originalTicketNo}
            </p>
            <p className={`text-red-700 ${textTiny}`}>
              Unit garansi ulang — tanpa ongkos ganda.
            </p>
          </div>
        )}

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-2.5 border-t" : "my-4 border-t-2"}`}
        />

        <div className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Estimasi Biaya</span>
            <span className="font-semibold">
              {ticket.isComplaint
                ? "Rp 0 (Garansi)"
                : ticket.customerFee > 0
                  ? formatRupiah(ticket.customerFee)
                  : "Menunggu diagnosa"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Est. Selesai</span>
            <span>
              {ticket.estimatedCompletionDate
                ? formatDateOnly(ticket.estimatedCompletionDate)
                : "Menunggu konfirmasi"}
            </span>
          </div>
        </div>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-2.5 border-t" : "my-4 border-t-2"}`}
        />

        <div>
          <p
            className={`mb-1 font-semibold uppercase tracking-wide text-slate-700 ${textTiny}`}
          >
            Syarat & Ketentuan
          </p>
          <ol
            className={`list-decimal space-y-1 pl-4 text-slate-600 ${textTiny}`}
          >
            <li>Tanda terima ini wajib dibawa saat pengambilan unit.</li>
            <li>
              Unit yang tidak diambil dalam kurun waktu 30 hari sejak
              pemberitahuan selesai di luar tanggung jawab toko.
            </li>
          </ol>
        </div>

        <div
          className={`grid grid-cols-2 gap-4 ${isThermal ? "mt-4" : "mt-8"} ${textTiny}`}
        >
          <div>
            <p className="mb-10 text-center text-slate-500">Pelanggan</p>
            <p className="border-t border-slate-400 pt-1 text-center text-slate-700">
              Tanda Tangan
            </p>
          </div>
          <div>
            <p className="mb-10 text-center text-slate-500">Kasir / Penerima</p>
            <p className="border-t border-slate-400 pt-1 text-center text-slate-700">
              Tanda Tangan
            </p>
          </div>
        </div>

        <p className={`mt-4 text-center text-slate-500 ${textTiny}`}>
          Simpan tanda terima ini. Tunjukkan saat mengambil unit.
        </p>
      </section>
    </article>
  );
}
