"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServiceTicket } from "@/types/service";
import ServiceIntakeReceiptDocument from "./ServiceIntakeReceiptDocument";
import type { ReceiptLayout } from "./ReceiptModal";

interface ServiceIntakeReceiptModalProps {
  ticket: ServiceTicket;
  onClose: () => void;
  /** Modal setelah buat baru vs cetak ulang */
  variant?: "created" | "reprint";
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function ServiceIntakeReceiptModal({
  ticket,
  onClose,
  variant = "created",
}: ServiceIntakeReceiptModalProps) {
  const [layout, setLayout] = useState<ReceiptLayout>("thermal");
  const isCreated = variant === "created";

  useEffect(() => {
    function syncLayoutToDocument() {
      if (typeof document === "undefined") return;
      document.documentElement.dataset.receiptLayout = layout;
    }

    function clearLayoutFromDocument() {
      if (typeof document === "undefined") return;
      delete document.documentElement.dataset.receiptLayout;
    }

    syncLayoutToDocument();
    window.addEventListener("beforeprint", syncLayoutToDocument);
    window.addEventListener("afterprint", clearLayoutFromDocument);

    return () => {
      window.removeEventListener("beforeprint", syncLayoutToDocument);
      window.removeEventListener("afterprint", clearLayoutFromDocument);
      clearLayoutFromDocument();
    };
  }, [layout]);

  const triggerPrint = useCallback(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dataset.receiptLayout = layout;
    window.print();
  }, [layout]);

  return (
    <div
      className="receipt-modal-root fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:inset-auto print:block print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-intake-receipt-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="receipt-modal-overlay absolute inset-0 bg-slate-950/70 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl print:border-0 print:bg-transparent print:shadow-none ${
          layout === "thermal" ? "max-w-sm" : "max-w-2xl"
        }`}
      >
        <div
          className={`receipt-modal-banner flex items-center gap-3 border-b px-5 py-4 print:hidden ${
            isCreated
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-slate-800 bg-slate-950/50"
          }`}
        >
          {isCreated && (
            <CheckCircleIcon className="h-8 w-8 shrink-0 text-emerald-400" />
          )}
          <div>
            <h2
              id="service-intake-receipt-title"
              className={`text-base font-semibold ${
                isCreated ? "text-emerald-100" : "text-white"
              }`}
            >
              {isCreated
                ? "Servis Masuk Berhasil Dibuat"
                : "Cetak Ulang Tanda Terima"}
            </h2>
            <p
              className={`text-sm ${
                isCreated ? "text-emerald-200/80" : "text-slate-400"
              }`}
            >
              {ticket.ticketNo}
              {ticket.isComplaint ? " · Garansi / Komplain" : " · Servis Baru"}
            </p>
          </div>
        </div>

        <div className="overflow-y-auto print:overflow-visible">
          <ServiceIntakeReceiptDocument
            ticket={ticket}
            layout={layout}
            className={
              layout === "thermal" ? "rounded-none" : "rounded-none border-x-0"
            }
          />
        </div>

        <div className="receipt-modal-actions space-y-3 border-t border-slate-800 bg-slate-950/80 px-5 py-4 print:hidden">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Format Cetak
            </legend>
            <div
              className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1"
              role="group"
              aria-label="Pilih format cetak"
            >
              <button
                type="button"
                onClick={() => setLayout("thermal")}
                aria-pressed={layout === "thermal"}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === "thermal"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                Thermal 80mm
              </button>
              <button
                type="button"
                onClick={() => setLayout("a4")}
                aria-pressed={layout === "a4"}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === "a4"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                A5 / A4
              </button>
            </div>
          </fieldset>

          <button
            type="button"
            onClick={triggerPrint}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            <PrinterIcon className="h-4 w-4" />
            Cetak Tanda Terima Servis
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
