"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { useStoreSettings } from "@/src/context/StoreSettingsContext";
import { generateBarcodeRects } from "@/lib/barcode-svg";

interface ProductBarcodeLabelModalProps {
  product: Product;
  onClose: () => void;
}

function formatRupiah(val: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export default function ProductBarcodeLabelModal({
  product,
  onClose,
}: ProductBarcodeLabelModalProps) {
  const { settings: store } = useStoreSettings();
  const [copyCount, setCopyCount] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<"single" | "grid">("single");

  const barcodeValue = product.barcode || product.serialNumber || product.id;

  const { rects, totalWidth } = useMemo(() => {
    return generateBarcodeRects(barcodeValue, 2, 48);
  }, [barcodeValue]);

  function triggerPrint() {
    window.print();
  }

  const copiesArray = useMemo(() => {
    const count = Math.max(1, Math.min(copyCount, 40));
    return Array.from({ length: count }, (_, i) => i);
  }, [copyCount]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm print:static print:inset-auto print:block print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 bg-transparent print:hidden"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl print:border-0 print:bg-transparent print:shadow-none print:max-w-none print:rounded-none">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 print:hidden">
          <div>
            <h2 id="label-modal-title" className="text-base font-bold text-white flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5 text-cyan-400"
                aria-hidden
              >
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
              Cetak Label Barcode Produk
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {product.name} ({product.id})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Tutup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content & Options */}
        <div className="p-5 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center gap-3">
              <label htmlFor="copy-count" className="text-xs font-semibold text-slate-300">
                Jumlah Label:
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 4, 8, Math.max(1, product.stock)].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setCopyCount(qty)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      copyCount === qty
                        ? "bg-cyan-600 text-white"
                        : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {qty}x
                  </button>
                ))}
                <input
                  id="copy-count"
                  type="number"
                  min={1}
                  max={40}
                  value={copyCount}
                  onChange={(e) => setCopyCount(Math.max(1, Number.parseInt(e.target.value || "1", 10)))}
                  className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-xs font-bold text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Layout:</span>
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setLabelSize("single")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    labelSize === "single" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Thermal Roll (Single)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize("grid")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    labelSize === "grid" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Lembar Stiker (Grid)
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            💡 Label ini dapat dicetak langsung menggunakan printer thermal sticker kasir (ukuran 40x30mm / 50x30mm) atau printer biasa pada kertas stiker.
          </p>
        </div>

        {/* PREVIEW CONTAINER / PRINT AREA */}
        <div className="max-h-[380px] overflow-y-auto p-5 bg-slate-950/70 border-t border-slate-800 print:max-h-none print:p-0 print:border-0 print:bg-white print:overflow-visible">
          <div
            id="barcode-label-print-area"
            className={
              labelSize === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid print:grid-cols-3 print:gap-2"
                : "flex flex-col items-center gap-3 print:flex print:flex-col print:items-center print:gap-2"
            }
          >
            {copiesArray.map((idx) => (
              <div
                key={idx}
                className="w-56 rounded-lg border border-slate-300 bg-white p-3 text-slate-900 shadow-sm print:border print:border-black print:shadow-none print:w-[50mm] print:h-[30mm] print:box-border print:p-1.5 print:page-break-inside-avoid"
              >
                {/* Header Toko */}
                <p className="text-center font-bold uppercase tracking-wider text-[10px] text-slate-700 truncate print:text-[8px] print:text-black">
                  {store.name}
                </p>

                {/* Nama Produk */}
                <p className="mt-0.5 text-center font-semibold text-xs text-slate-900 leading-snug line-clamp-1 print:text-[9px] print:font-bold">
                  {product.name}
                </p>

                {/* Barcode Vector SVG */}
                <div className="mt-1 flex justify-center print:mt-0.5">
                  <svg
                    viewBox={`0 0 ${totalWidth} 48`}
                    className="h-9 w-auto max-w-full print:h-7"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {rects.map((r, rIdx) => (
                      <rect
                        key={rIdx}
                        x={r.x}
                        y={r.y}
                        width={r.width}
                        height={r.height}
                        fill="#000000"
                      />
                    ))}
                  </svg>
                </div>

                {/* Human Readable Code */}
                <p className="text-center font-mono font-bold text-[10px] tracking-widest text-slate-800 print:text-[8px] print:text-black">
                  {barcodeValue}
                </p>

                {/* Harga Jual */}
                <div className="mt-1 border-t border-dashed border-slate-300 pt-1 text-center print:mt-0.5 print:pt-0.5">
                  <span className="font-extrabold text-xs text-slate-900 print:text-[10px]">
                    {formatRupiah(product.sellingPrice)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950 p-4 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={triggerPrint}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-900/40 transition hover:bg-cyan-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Cetak Label ({copyCount}x)
          </button>
        </div>
      </div>
    </div>
  );
}

