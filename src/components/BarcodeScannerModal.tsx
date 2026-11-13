"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
  description?: string;
  placeholderManual?: string;
}

function playBeepSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // AudioContext not supported or autoplay blocked
  }
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Pindai Barcode / QR",
  description = "Arahkan kamera ke barcode produk atau tiket servis",
  placeholderManual = "Ketik barcode/kode secara manual...",
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "rk-barcode-scanner-viewport";

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setHasScanned(false);
    setErrorMessage(null);
    setIsPermissionDenied(false);
    setIsInitializing(true);

    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    async function startCamera() {
      try {
        const scanner = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.75);
              return { width: Math.max(qrboxSize, 220), height: Math.max(Math.floor(qrboxSize * 0.65), 160) };
            },
            aspectRatio: 1.3333,
          },
          (decodedText) => {
            if (!isMounted) return;
            handleSuccess(decodedText);
          },
          () => {
            // Frame scan without barcode — normal, ignore
          },
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsInitializing(false);
        const errObj = err as { name?: string; message?: string };
        const name = errObj?.name || "";
        const msg = errObj?.message || "";

        if (
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          msg.toLowerCase().includes("permission")
        ) {
          setIsPermissionDenied(true);
          setErrorMessage(
            "Izin kamera ditolak. Mohon aktifkan izin kamera di pengaturan peramban (browser) Anda untuk memindai barcode.",
          );
        } else if (
          name === "NotFoundError" ||
          name === "DevicesNotFoundError" ||
          msg.toLowerCase().includes("not found")
        ) {
          setErrorMessage(
            "Kamera tidak terdeteksi pada perangkat ini. Anda dapat memasukkan kode secara manual.",
          );
        } else {
          setErrorMessage(
            msg || "Gagal mengakses kamera perangkat. Coba gunakan input manual di bawah.",
          );
        }
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Safe catch on cleanup
      }
      scannerRef.current = null;
    }
  }

  async function handleSuccess(code: string) {
    if (hasScanned) return;
    setHasScanned(true);

    playBeepSound();

    // Matikan kamera terlebih dahulu
    await stopScanner();

    // Kirim hasil scan dan tutup popup
    onScan(code.trim());
    onClose();
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    void stopScanner();
    onScan(code);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2
              id="scanner-modal-title"
              className="text-base font-bold text-white flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5 text-cyan-400"
                aria-hidden
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Tutup pemindai"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Viewport Kamera Scanner */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[260px] max-h-[360px] overflow-hidden">
          {/* Container DOM yang digunakan html5-qrcode */}
          <div
            id={readerId}
            className="w-full h-full [&_video]:w-full [&_video]:object-cover"
          />

          {/* Loading State */}
          {isInitializing && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 gap-3 text-slate-300 z-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-xs font-medium">Menghubungkan ke kamera...</p>
            </div>
          )}

          {/* Error / Permission Denied State */}
          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">
                {isPermissionDenied ? "Akses Kamera Diblokir" : "Kamera Tidak Tersedia"}
              </p>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed max-w-xs">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Scanning Overlay Visual (Laser line & Reticle) */}
          {!isInitializing && !errorMessage && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-44 rounded-xl border-2 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center">
                {/* Corner brackets */}
                <span className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-cyan-300" />
                <span className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-cyan-300" />
                <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-cyan-300" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-cyan-300" />

                {/* Animated Laser Scan Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-[0_0_8px_#22d3ee]" />
              </div>
            </div>
          )}
        </div>

        {/* Fallback Input Manual */}
        <div className="border-t border-slate-800 bg-slate-950 p-4">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Input Manual (Jika Barcode Rusak)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={placeholderManual}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 shadow-inner focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600"
              >
                Gunakan
              </button>
            </div>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-xl border border-slate-800 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            Tutup Pemindai
          </button>
        </div>
      </div>
    </div>
  );
}

