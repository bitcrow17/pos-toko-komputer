"use client";

import { STORE_INFO } from "@/lib/store-config";
import type { Partner, ServiceTicket } from "@/types/service";
import type { ReceiptLayout } from "./ReceiptModal";

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

interface ServiceManifestDocumentProps {
  ticket: ServiceTicket;
  partner: Partner;
  layout: ReceiptLayout;
  className?: string;
}

export default function ServiceManifestDocument({
  ticket,
  partner,
  layout,
  className = "",
}: ServiceManifestDocumentProps) {
  const isThermal = layout === "thermal";

  return (
    <article
      className={`receipt-print-area bg-white text-slate-900 ${className}`}
      aria-label="Surat jalan pengiriman servis"
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
          SURAT JALAN PENGIRIMAN SERVIS
        </h2>
        <p
          className={`mt-1 font-mono text-slate-700 ${isThermal ? "text-[11px]" : "text-sm"}`}
        >
          {ticket.ticketNo}
        </p>
        <p
          className={`text-slate-500 ${isThermal ? "text-[10px]" : "text-xs"}`}
        >
          {formatTimestamp(ticket.updatedAt)}
        </p>
      </header>

      <section className={isThermal ? "px-3 pb-3 text-[11px]" : "px-8 pb-6 text-sm"}>
        <div className="space-y-2">
          <div className="flex justify-between gap-2 border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-500">Tujuan Mitra</span>
            <span className="text-right font-semibold text-slate-900">
              {partner.name}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-500">Alamat Mitra</span>
            <span className="max-w-[55%] text-right text-slate-800">
              {partner.address}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-b border-dashed border-slate-200 pb-2">
            <span className="text-slate-500">HP Mitra</span>
            <span className="text-slate-800">{partner.phone}</span>
          </div>
        </div>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-3 border-t" : "my-5 border-t-2"}`}
        />

        <h3
          className={`mb-2 font-semibold uppercase tracking-wide text-slate-700 ${
            isThermal ? "text-[10px]" : "text-xs"
          }`}
        >
          Detail Unit Servis
        </h3>

        <div className="space-y-2">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Pelanggan</span>
            <span className="text-right text-slate-900">{ticket.customerName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">HP Pelanggan</span>
            <span className="text-slate-800">{ticket.customerPhone}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Perangkat</span>
            <span className="max-w-[55%] text-right text-slate-900">
              {ticket.deviceName}
            </span>
          </div>
          {ticket.serialNumber && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Serial</span>
              <span className="font-mono text-slate-800">{ticket.serialNumber}</span>
            </div>
          )}
          <div className="border-t border-dashed border-slate-200 pt-2">
            <p className="text-slate-500">Keluhan:</p>
            <p className="mt-1 text-slate-900">{ticket.problem}</p>
          </div>
        </div>

        <div
          className={`border-dashed border-slate-300 ${isThermal ? "my-3 border-t" : "my-5 border-t-2"}`}
        />

        <div className={`grid grid-cols-2 gap-6 ${isThermal ? "text-[10px]" : "text-xs"}`}>
          <div>
            <p className="mb-8 text-slate-500">Pengirim (Toko Utama)</p>
            <p className="border-t border-slate-400 pt-1 text-center text-slate-700">
              Tanda Tangan & Stempel
            </p>
          </div>
          <div>
            <p className="mb-8 text-slate-500">Penerima (Mitra)</p>
            <p className="border-t border-slate-400 pt-1 text-center text-slate-700">
              Tanda Tangan & Stempel
            </p>
          </div>
        </div>

        <p
          className={`mt-4 text-center text-slate-500 ${isThermal ? "text-[9px]" : "text-[11px]"}`}
        >
          Dokumen ini sebagai bukti fisik perbandingan barang saat pengiriman
          servis ke mitra rekan.
        </p>
      </section>
    </article>
  );
}
