"use client";

import { useCallback, useEffect, useState } from "react";
import type { ServiceTicket } from "@/types/service";
import type { Transaction } from "@/types/transaction";
import ServicePickupReceiptDocument from "./ServicePickupReceiptDocument";
import type { ReceiptLayout } from "./ReceiptModal";

interface ServicePickupReceiptModalProps {
  transaction: Transaction;
  ticket: ServiceTicket;
  onClose: () => void;
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

export default function ServicePickupReceiptModal({
  transaction,
  ticket,
  onClose,
}: ServicePickupReceiptModalProps) {
  const [layout, setLayout] = useState<ReceiptLayout>("thermal");

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
      aria-labelledby="service-pickup-title"
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
        <div className="receipt-modal-banner flex items-center gap-3 border-b border-emerald-500/30 bg-emerald-500/10 px-5 py-4 print:hidden">
          <div>
            <h2
              id="service-pickup-title"
              className="text-base font-semibold text-emerald-100"
            >
              Unit Siap Diserahkan
            </h2>
            <p className="text-sm text-emerald-200/80">
              Kas{" "}
              {transaction.totalHarga > 0
                ? "servis telah dicatat"
                : "komplain (Rp 0) telah dicatat"}
              . Cetak struk pengambilan.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto print:overflow-visible">
          <ServicePickupReceiptDocument
            transaction={transaction}
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
            >
              <button
                type="button"
                onClick={() => setLayout("thermal")}
                aria-pressed={layout === "thermal"}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === "thermal"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                Struk 80mm
              </button>
              <button
                type="button"
                onClick={() => setLayout("a4")}
                aria-pressed={layout === "a4"}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === "a4"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                A4
              </button>
            </div>
          </fieldset>

          <button
            type="button"
            onClick={triggerPrint}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            <PrinterIcon className="h-4 w-4" />
            Cetak Struk Pengambilan
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
