"use client";

import { useCallback, useEffect, useState } from "react";
import { openWhatsAppShare } from "@/lib/receipt-share";

export type ReceiptLayout = "a4" | "thermal" | "digital";

export function useReceiptPrintLayout(initial: ReceiptLayout = "thermal") {
  const [layout, setLayout] = useState<ReceiptLayout>(initial);

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

  const triggerPrint = useCallback(
    (nextLayout?: ReceiptLayout) => {
      if (typeof window === "undefined") return;
      const resolved = nextLayout ?? layout;
      if (nextLayout) setLayout(nextLayout);
      document.documentElement.dataset.receiptLayout = resolved;
      window.setTimeout(() => window.print(), 50);
    },
    [layout],
  );

  return { layout, setLayout, triggerPrint };
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.5 3.5A11 11 0 0 0 2.1 17.4L1 23l5.8-1.1A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.4.6.7-3.3-.2-.3A9 9 0 1 1 12 21Zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.3-.4c.1-.2 0-.3 0-.4l-.9-2.1c-.2-.6-.5-.5-.6-.5h-.5c-.2 0-.4.1-.6.3s-.8.8-.8 1.9.8 2.2.9 2.3a10.4 10.4 0 0 0 4 3.4c.6.2 1 .4 1.4.3s1.3-.5 1.5-1 .3-.9.2-1c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

export function receiptModalWidthClass(layout: ReceiptLayout): string {
  return layout === "a4" ? "max-w-2xl" : "max-w-sm";
}

interface ReceiptPrintBarProps {
  layout: ReceiptLayout;
  onLayoutChange: (layout: ReceiptLayout) => void;
  onPrint: (layout?: ReceiptLayout) => void;
  printLabel?: string;
  shareText?: string;
  sharePhone?: string;
  showDigital?: boolean;
  onClose?: () => void;
  closeLabel?: string;
}

export default function ReceiptPrintBar({
  layout,
  onLayoutChange,
  onPrint,
  printLabel = "Cetak Nota",
  shareText,
  sharePhone,
  showDigital = true,
  onClose,
  closeLabel = "Tutup",
}: ReceiptPrintBarProps) {
  return (
    <div className="receipt-modal-actions space-y-3 border-t border-slate-800 bg-slate-950/80 px-5 py-4 print:hidden">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Format Nota
        </legend>
        <div
          className="inline-flex flex-wrap rounded-lg border border-slate-700 bg-slate-900 p-1"
          role="group"
          aria-label="Pilih format nota"
        >
          {(
            [
              { value: "thermal", label: "Struk 80mm" },
              { value: "digital", label: "Nota Digital" },
              { value: "a4", label: "Faktur A4" },
            ] as const
          )
            .filter((item) => showDigital || item.value !== "digital")
            .map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onLayoutChange(item.value)}
                aria-pressed={layout === item.value}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  layout === item.value
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onPrint(layout === "digital" ? "thermal" : layout)}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          <PrinterIcon className="h-4 w-4" />
          {printLabel}
        </button>
        <button
          type="button"
          onClick={() => onPrint("digital")}
          title='Pilih "Save as PDF" / "Simpan sebagai PDF" di dialog cetak'
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-500/50 hover:bg-slate-700"
        >
          <DownloadIcon className="h-4 w-4" />
          Unduh PDF
        </button>
      </div>

      {shareText && (
        <button
          type="button"
          onClick={() => openWhatsAppShare(shareText, sharePhone)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Bagikan via WhatsApp
        </button>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
        >
          {closeLabel}
        </button>
      )}
    </div>
  );
}
