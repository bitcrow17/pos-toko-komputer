"use client";

import { useCallback, useEffect, useState } from "react";
import type { DebtPaymentReceipt } from "@/types/debt-payment";
import DebtPaymentReceiptDocument from "./DebtPaymentReceiptDocument";
import type { ReceiptLayout } from "./ReceiptModal";

interface DebtPaymentReceiptModalProps {
  receipt: DebtPaymentReceipt;
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

function ThermalReceiptIcon({ className }: { className?: string }) {
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
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function DocumentA4Icon({ className }: { className?: string }) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export default function DebtPaymentReceiptModal({
  receipt,
  onClose,
}: DebtPaymentReceiptModalProps) {
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
      className="receipt-modal-root fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 print:static print:inset-auto print:block print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-payment-receipt-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="receipt-modal-overlay absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-5xl h-[92vh] max-h-[820px] flex-col md:flex-row overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl print:h-auto print:max-h-none print:max-w-none print:border-0 print:bg-transparent print:shadow-none print:rounded-none">
        
        {/* KOLOM UTAMA (TENGAH / KIRI): AREA PRATAYANG BUKTI BAYAR UTANG */}
        <section
          aria-label="Pratayang Bukti Bayar Utang"
          className="flex-1 flex flex-col min-w-0 bg-slate-950/60 print:bg-transparent print:block print:p-0"
        >
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-400 print:hidden">
            <span className="flex items-center gap-2 font-medium text-slate-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Pratayang Bukti Bayar ({layout === "thermal" ? "Thermal 80mm" : "Format A5/A4"})
            </span>
            <span className="text-[11px] text-slate-500">
              Gunakan scroll bila nota panjang
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start print:p-0 print:overflow-visible print:block">
            <div
              className={`transition-all duration-200 print:w-full ${
                layout === "thermal"
                  ? "w-[340px] max-w-full shadow-2xl rounded-sm ring-1 ring-slate-800"
                  : "w-[580px] max-w-full shadow-2xl rounded-sm ring-1 ring-slate-800"
              }`}
            >
              <DebtPaymentReceiptDocument
                receipt={receipt}
                layout={layout}
                className="rounded-sm"
              />
            </div>
          </div>
        </section>

        {/* SIDEBAR PANEL (SAMPING KANAN): KONTROL FORMAT & TOMBOL AKSI */}
        <aside
          aria-label="Panel Opsi Cetak"
          className="receipt-modal-actions w-full md:w-80 lg:w-96 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900 flex flex-col justify-between overflow-y-auto print:hidden"
        >
          <div className="p-5 space-y-5">
            <div className="receipt-modal-banner flex items-start gap-3">
              <CheckCircleIcon className="h-7 w-7 shrink-0 text-emerald-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h2
                  id="debt-payment-receipt-title"
                  className="text-base font-bold text-white truncate"
                >
                  Pembayaran Tercatat
                </h2>
                <p className="mt-0.5 font-mono text-xs font-semibold text-cyan-400">
                  {receipt.id}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  {receipt.customerName} · Sisa:{" "}
                  <strong className={receipt.remainingAfter <= 0 ? "text-emerald-400" : "text-amber-400"}>
                    {receipt.remainingAfter <= 0 ? "LUNAS" : `Rp ${receipt.remainingAfter.toLocaleString("id-ID")}`}
                  </strong>
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800/80" />

            {/* Pilihan Format Kertas */}
            <fieldset className="space-y-2.5">
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Format Kertas Cetak
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLayout("thermal")}
                  aria-pressed={layout === "thermal"}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                    layout === "thermal"
                      ? "border-cyan-500 bg-cyan-950/30 text-white ring-1 ring-cyan-500/50"
                      : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <ThermalReceiptIcon
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      layout === "thermal" ? "text-cyan-400" : "text-slate-500"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      Struk 80mm
                      {layout === "thermal" && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-normal">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Struk bukti bayar kasir roll untuk pelanggan.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLayout("a4")}
                  aria-pressed={layout === "a4"}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                    layout === "a4"
                      ? "border-cyan-500 bg-cyan-950/30 text-white ring-1 ring-cyan-500/50"
                      : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <DocumentA4Icon
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      layout === "a4" ? "text-cyan-400" : "text-slate-500"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      Kuitansi A5 / A4
                      {layout === "a4" && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-normal">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Format tanda terima kuitansi piutang formal untuk arsip.
                    </p>
                  </div>
                </button>
              </div>
            </fieldset>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400">
              <p className="font-semibold text-slate-300">💡 Informasi Pelunasan:</p>
              <p className="mt-1 leading-relaxed">
                Bukti bayar mencantumkan tanggal, metode pembayaran, dan sisa
                kewajiban piutang pelanggan.
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
            <button
              type="button"
              onClick={triggerPrint}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 transition hover:bg-cyan-500 active:scale-[0.99]"
            >
              <PrinterIcon className="h-5 w-5" />
              Cetak Bukti Pembayaran
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-700/80 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Tutup
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
