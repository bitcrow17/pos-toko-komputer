"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/types/transaction";
import type { Debt } from "@/types/debt";
import ReceiptDocument from "./ReceiptDocument";

export type ReceiptLayout = "a4" | "thermal" | "digital";

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
  /** Judul banner sukses (kasir) vs detail (riwayat) */
  variant?: "success" | "detail";
  /** Info utang untuk nota tempo (opsional) */
  debt?: Pick<Debt, "remainingAmount" | "dueDate" | "status"> | null;
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

function DownloadIcon({ className }: { className?: string }) {
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
      <path d="M12 15V3" />
      <path d="M7 10l5 5 5-5" />
      <path d="M21 21H3" />
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

export default function ReceiptModal({
  transaction,
  onClose,
  variant = "success",
  debt = null,
}: ReceiptModalProps) {
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

  const isSuccess = variant === "success";

  return (
    <div
      className="receipt-modal-root fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 print:static print:inset-auto print:block print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="receipt-modal-overlay absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-5xl h-[92vh] max-h-[820px] flex-col md:flex-row overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl print:h-auto print:max-h-none print:max-w-none print:border-0 print:bg-transparent print:shadow-none print:rounded-none">
        
        {/* KOLOM UTAMA (TENGAH / KIRI): AREA PRATAYANG STRUK BELANJA */}
        <section
          aria-label="Pratayang Struk Penjualan"
          className="flex-1 flex flex-col min-w-0 bg-slate-950/60 print:bg-transparent print:block print:p-0"
        >
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-400 print:hidden">
            <span className="flex items-center gap-2 font-medium text-slate-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Pratayang Struk ({layout === "thermal" ? "Thermal 80mm" : "Format A5/A4"})
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
              <ReceiptDocument
                transaction={transaction}
                layout={layout}
                debt={debt}
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
              {isSuccess && (
                <CheckCircleIcon className="h-7 w-7 shrink-0 text-emerald-400 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <h2
                  id="receipt-modal-title"
                  className="text-base font-bold text-white truncate"
                >
                  {isSuccess ? "Pembayaran Berhasil" : "Detail Struk Kasir"}
                </h2>
                <p className="mt-0.5 font-mono text-xs font-semibold text-cyan-400">
                  {transaction.id}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  {transaction.customerName
                    ? `${transaction.customerName} · `
                    : ""}
                  {transaction.items.length} item barang
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
                      Format struk kasir roll standar toko retail.
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
                      Faktur A5 / A4
                      {layout === "a4" && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-normal">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Format faktur penjualan resmi untuk nota pembelian partai/kantor.
                    </p>
                  </div>
                </button>
              </div>
            </fieldset>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400">
              <p className="font-semibold text-slate-300">💡 Tips Kasir:</p>
              <p className="mt-1 leading-relaxed">
                Gunakan tombol unduh PDF bila pelanggan menginginkan salinan
                digital via pesan/email.
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={triggerPrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/40 transition hover:bg-cyan-500 active:scale-[0.99]"
              >
                <PrinterIcon className="h-4 w-4" />
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                title='Pilih "Save as PDF" di dialog cetak'
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-700"
              >
                <DownloadIcon className="h-4 w-4" />
                Unduh PDF
              </button>
            </div>

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
