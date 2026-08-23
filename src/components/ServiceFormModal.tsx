"use client";

import { useEffect, useState } from "react";
import { SERVICE_ACCESSORY_LABEL } from "@/lib/service";
import type {
  Partner,
  ServiceAccessory,
  ServiceTicketInput,
} from "@/types/service";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

const ACCESSORY_OPTIONS: ServiceAccessory[] = ["UNIT", "CHARGER", "BOX"];

interface ServiceFormModalProps {
  open: boolean;
  partners: Partner[];
  onClose: () => void;
  onSave: (input: ServiceTicketInput) => void;
}

function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export default function ServiceFormModal({
  open,
  partners,
  onClose,
  onSave,
}: ServiceFormModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [problem, setProblem] = useState("");
  const [handlingType, setHandlingType] = useState<"INTERNAL" | "PARTNER">(
    "INTERNAL",
  );
  const [partnerId, setPartnerId] = useState("");
  const [customerFeeInput, setCustomerFeeInput] = useState("");
  const [isComplaint, setIsComplaint] = useState(false);
  const [originalTicketNo, setOriginalTicketNo] = useState("");
  const [accessories, setAccessories] = useState<ServiceAccessory[]>(["UNIT"]);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomerName("");
    setCustomerPhone("");
    setDeviceName("");
    setSerialNumber("");
    setProblem("");
    setHandlingType("INTERNAL");
    setPartnerId(partners[0]?.id ?? "");
    setCustomerFeeInput("");
    setIsComplaint(false);
    setOriginalTicketNo("");
    setAccessories(["UNIT"]);
    setEstimatedCompletionDate("");
    setError(null);
  }, [open, partners]);

  if (!open) return null;

  function toggleAccessory(item: ServiceAccessory) {
    if (item === "UNIT") return;
    setAccessories((prev) =>
      prev.includes(item)
        ? prev.filter((a) => a !== item)
        : [...prev, item],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      onSave({
        customerName,
        customerPhone,
        deviceName,
        serialNumber: serialNumber.trim() || undefined,
        problem,
        handlingType,
        partnerId: handlingType === "PARTNER" ? partnerId : undefined,
        partnerStatus: handlingType === "PARTNER" ? "PENDING_SEND" : undefined,
        partnerFee: 0,
        customerFee: isComplaint ? 0 : parseRupiahInput(customerFeeInput),
        isComplaint,
        originalTicketNo: isComplaint ? originalTicketNo.trim() : undefined,
        accessories,
        estimatedCompletionDate: estimatedCompletionDate || undefined,
        sparepartCost: 0,
        status: "QUEUED",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan servis.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-form-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="service-form-title" className="text-lg font-semibold text-white">
            Input Servis Baru
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Data pelanggan, perangkat, dan tipe penanganan servis.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <label className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isComplaint}
              onChange={(e) => {
                setIsComplaint(e.target.checked);
                if (e.target.checked) setCustomerFeeInput("0");
              }}
              className="mt-0.5 rounded border-slate-600 bg-slate-950 text-red-500"
            />
            <span>
              <span className="font-semibold text-red-300">
                Barang Komplain / Garansi Ulang
              </span>
              <span className="mt-0.5 block text-xs text-slate-400">
                Biaya pelanggan otomatis Rp 0 — anti double-payment.
              </span>
            </span>
          </label>

          {isComplaint && (
            <label className="block text-sm text-slate-400">
              Nomor Nota / Tiket Servis Sebelumnya
              <input
                type="text"
                required
                value={originalTicketNo}
                onChange={(e) => setOriginalTicketNo(e.target.value)}
                placeholder="Contoh: SVC-2026-0001"
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
          )}

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Data Pelanggan
            </legend>
            <label className="block text-sm text-slate-400">
              Nama Pelanggan
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
            <label className="block text-sm text-slate-400">
              Nomor HP
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Detail Perangkat
            </legend>
            <label className="block text-sm text-slate-400">
              Nama Perangkat
              <input
                type="text"
                required
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
            <label className="block text-sm text-slate-400">
              Serial Number (opsional)
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
            <label className="block text-sm text-slate-400">
              Keluhan / Masalah
              <textarea
                required
                rows={3}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5 resize-none`}
              />
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kelengkapan Unit Diterima
            </legend>
            <div className="flex flex-wrap gap-2">
              {ACCESSORY_OPTIONS.map((item) => {
                const checked = accessories.includes(item);
                const locked = item === "UNIT";
                return (
                  <label
                    key={item}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      checked
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-100"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggleAccessory(item)}
                      className="rounded border-slate-600 bg-slate-950 text-cyan-500"
                    />
                    {SERVICE_ACCESSORY_LABEL[item]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Penanganan
            </legend>
            <div
              className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1"
              role="group"
              aria-label="Tipe penanganan servis"
            >
              <button
                type="button"
                onClick={() => setHandlingType("INTERNAL")}
                aria-pressed={handlingType === "INTERNAL"}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  handlingType === "INTERNAL"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Internal
              </button>
              <button
                type="button"
                onClick={() => setHandlingType("PARTNER")}
                aria-pressed={handlingType === "PARTNER"}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  handlingType === "PARTNER"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Kirim ke Toko Rekan
              </button>
            </div>

            {handlingType === "PARTNER" && (
              <label className="block text-sm text-slate-400">
                Mitra Rekan
                <select
                  required
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className={`${INPUT_CLASS} mt-1.5`}
                >
                  {partners.length === 0 ? (
                    <option value="">Belum ada mitra terdaftar</option>
                  ) : (
                    partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            )}
          </fieldset>

          {!isComplaint && (
            <label className="block text-sm text-slate-400">
              Estimasi Biaya Pelanggan (opsional)
              <input
                type="text"
                inputMode="numeric"
                value={customerFeeInput}
                onChange={(e) => setCustomerFeeInput(e.target.value)}
                placeholder="0"
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
          )}

          <label className="block text-sm text-slate-400">
            Estimasi Tanggal Selesai (opsional)
            <input
              type="date"
              value={estimatedCompletionDate}
              onChange={(e) => setEstimatedCompletionDate(e.target.value)}
              className={`${INPUT_CLASS} mt-1.5 [color-scheme:dark]`}
            />
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={handlingType === "PARTNER" && partners.length === 0}
            className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Simpan Servis
          </button>
        </div>
      </form>
    </div>
  );
}
