"use client";

import { useEffect, useState } from "react";
import { CUSTOMER_TYPE_LABEL } from "@/lib/customer";
import type { Customer, CustomerInput, CustomerType } from "@/types/customer";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";

export interface CustomerFormValues {
  name: string;
  phone: string;
  address: string;
  type: CustomerType;
  creditLimit: string;
}

const EMPTY_FORM: CustomerFormValues = {
  name: "",
  phone: "",
  address: "",
  type: "REGULAR",
  creditLimit: "",
};

function customerToForm(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone,
    address: customer.address ?? "",
    type: customer.type,
    creditLimit:
      customer.creditLimit != null ? String(customer.creditLimit) : "",
  };
}

export function formToCustomerInput(form: CustomerFormValues): CustomerInput {
  const limitDigits = form.creditLimit.replace(/\D/g, "");
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    address: form.address.trim() || undefined,
    type: form.type,
    creditLimit: limitDigits ? Number(limitDigits) : undefined,
  };
}

interface CustomerFormModalProps {
  open: boolean;
  title: string;
  initialCustomer?: Customer | null;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (input: CustomerInput) => void;
}

export default function CustomerFormModal({
  open,
  title,
  initialCustomer = null,
  submitLabel = "Simpan",
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialCustomer ? customerToForm(initialCustomer) : EMPTY_FORM);
    setError(null);
  }, [open, initialCustomer]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      onSubmit(formToCustomerInput(form));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pelanggan.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-form-title"
    >
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <h2
          id="customer-form-title"
          className="text-lg font-semibold text-white"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Data pelanggan tersimpan di master data dan bisa dipakai di Kasir.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs text-slate-400">
            Nama Pelanggan / Perusahaan *
            <input
              type="text"
              className={INPUT_CLASS}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nama lengkap atau nama instansi"
              required
              autoFocus
            />
          </label>

          <label className="block text-xs text-slate-400">
            Nomor HP *
            <input
              type="tel"
              className={INPUT_CLASS}
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="08xxxxxxxxxx"
              required
            />
          </label>

          <label className="block text-xs text-slate-400">
            Alamat
            <textarea
              className={`${INPUT_CLASS} min-h-[4.5rem] resize-y`}
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Alamat lengkap (opsional)"
              rows={3}
            />
          </label>

          <fieldset>
            <legend className="text-xs text-slate-400">Tipe Pelanggan *</legend>
            <div className="mt-1.5 inline-flex flex-wrap rounded-xl border border-slate-700 bg-slate-950 p-1">
              {(["REGULAR", "CORPORATE"] as const).map((type) => {
                const active = form.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type }))}
                    aria-pressed={active}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-cyan-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {CUSTOMER_TYPE_LABEL[type]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="block text-xs text-slate-400">
            Limit Utang (Rp)
            <input
              type="text"
              inputMode="numeric"
              className={`${INPUT_CLASS} tabular-nums`}
              value={form.creditLimit}
              onChange={(e) =>
                setForm((f) => ({ ...f, creditLimit: e.target.value }))
              }
              placeholder="Opsional — misal 5000000"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
