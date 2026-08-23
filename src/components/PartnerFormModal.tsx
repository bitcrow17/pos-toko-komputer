"use client";

import { useEffect, useState } from "react";
import type { Partner, PartnerInput } from "@/types/service";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

interface PartnerFormModalProps {
  open: boolean;
  partner: Partner | null;
  onClose: () => void;
  onSave: (input: PartnerInput) => void;
}

export default function PartnerFormModal({
  open,
  partner,
  onClose,
  onSave,
}: PartnerFormModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(partner?.name ?? "");
    setPhone(partner?.phone ?? "");
    setAddress(partner?.address ?? "");
    setError(null);
  }, [open, partner]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      onSave({ name, phone, address });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan mitra.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-form-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="partner-form-title" className="text-lg font-semibold text-white">
            {partner ? "Edit Mitra Rekan" : "Tambah Mitra Rekan"}
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <label className="block text-sm text-slate-400">
            Nama Toko Mitra
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${INPUT_CLASS} mt-1.5`}
            />
          </label>
          <label className="block text-sm text-slate-400">
            Nomor HP
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${INPUT_CLASS} mt-1.5`}
            />
          </label>
          <label className="block text-sm text-slate-400">
            Alamat
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`${INPUT_CLASS} mt-1.5 resize-none`}
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
            className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
