"use client";

import { useEffect, useState } from "react";
import { INPUT_CLASS, MODAL_OVERLAY, MODAL_PANEL } from "@/lib/ui-classes";

export interface CreditDebtFormValues {
  customerName: string;
  customerPhone: string;
  dueDate: string;
  note: string;
  downPayment: string;
}

interface KasirCreditDebtModalProps {
  open: boolean;
  initialValues: CreditDebtFormValues;
  onClose: () => void;
  onConfirm: (values: CreditDebtFormValues) => void;
}

export default function KasirCreditDebtModal({
  open,
  initialValues,
  onClose,
  onConfirm,
}: KasirCreditDebtModalProps) {
  const [form, setForm] = useState<CreditDebtFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialValues);
    setError(null);
  }, [open, initialValues]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.customerName.trim();
    const phone = form.customerPhone.trim();
    if (!name) {
      setError("Nama pelanggan wajib diisi.");
      return;
    }
    if (!phone) {
      setError("Nomor HP wajib diisi.");
      return;
    }
    if (!form.dueDate) {
      setError("Tanggal jatuh tempo wajib diisi.");
      return;
    }
    onConfirm({
      ...form,
      customerName: name,
      customerPhone: phone,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-debt-modal-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className={MODAL_OVERLAY}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className={`${MODAL_PANEL} max-w-md`}
      >
        <h2
          id="credit-debt-modal-title"
          className="text-lg font-bold text-slate-800"
        >
          Bayar via Utang / Piutang
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Isi data pelanggan untuk mencatat transaksi sebagai utang.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Nama Pelanggan *
            <input
              type="text"
              className={`${INPUT_CLASS} mt-1`}
              value={form.customerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerName: e.target.value }))
              }
              placeholder="Nama lengkap pelanggan"
              required
              autoFocus
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            No. HP *
            <input
              type="tel"
              className={`${INPUT_CLASS} mt-1`}
              value={form.customerPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerPhone: e.target.value }))
              }
              placeholder="08xxxxxxxxxx"
              required
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Jatuh Tempo *
            <input
              type="date"
              className={`${INPUT_CLASS} mt-1`}
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
              required
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Catatan
            <textarea
              className={`${INPUT_CLASS} mt-1 min-h-[4.5rem] resize-y`}
              value={form.note}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
              placeholder="Catatan utang (opsional)"
              rows={3}
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Uang Muka (opsional)
            <input
              type="text"
              inputMode="numeric"
              className={`${INPUT_CLASS} mt-1 tabular-nums`}
              value={form.downPayment}
              onChange={(e) =>
                setForm((f) => ({ ...f, downPayment: e.target.value }))
              }
              placeholder="0"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
          >
            Konfirmasi Utang
          </button>
        </div>
      </form>
    </div>
  );
}
