"use client";

import { useEffect, useState } from "react";
import {
  SERVICE_STATUS_LABEL,
  SERVICE_STATUS_ORDER,
} from "@/lib/service";
import { INPUT_CLASS } from "@/lib/ui-classes";
import type { ServiceStatus, ServiceTicket } from "@/types/service";

interface ServiceTicketEditModalProps {
  open: boolean;
  ticket: ServiceTicket | null;
  onClose: () => void;
  onSave: (updates: {
    problem: string;
    workNotes: string;
    status: ServiceStatus;
    isComplaint: boolean;
    originalTicketNo?: string;
  }) => void | Promise<void>;
}

export default function ServiceTicketEditModal({
  open,
  ticket,
  onClose,
  onSave,
}: ServiceTicketEditModalProps) {
  const [problem, setProblem] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [status, setStatus] = useState<ServiceStatus>("QUEUED");
  const [isComplaint, setIsComplaint] = useState(false);
  const [originalTicketNo, setOriginalTicketNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !ticket) return;
    setProblem(ticket.problem);
    setWorkNotes(ticket.workNotes ?? "");
    setStatus(ticket.status);
    setIsComplaint(ticket.isComplaint || ticket.status === "COMPLAINT");
    setOriginalTicketNo(ticket.originalTicketNo ?? "");
    setError(null);
    setIsSaving(false);
  }, [open, ticket]);

  if (!open || !ticket) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving || !ticket) return;
    setError(null);

    const trimmedProblem = problem.trim();
    if (!trimmedProblem) {
      setError("Catatan kerusakan / keluhan tidak boleh kosong.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        problem: trimmedProblem,
        workNotes: workNotes.trim(),
        status: isComplaint && status !== "CANCELLED" ? "COMPLAINT" : status,
        isComplaint,
        originalTicketNo: isComplaint
          ? originalTicketNo.trim() || ticket.ticketNo
          : undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui tiket servis.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-edit-title"
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
          <h2 id="service-edit-title" className="text-lg font-semibold text-white">
            Update Catatan & Status
          </h2>
          <p className="mt-1 font-mono text-sm text-cyan-300">{ticket.ticketNo}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Catatan kerusakan dan pengerjaan bisa diubah kapan saja, termasuk
            catatan mitra.
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <label className="block text-sm text-slate-400">
            Status Pengerjaan
            <select
              value={status}
              onChange={(e) => {
                const next = e.target.value as ServiceStatus;
                setStatus(next);
                if (next === "COMPLAINT") setIsComplaint(true);
              }}
              className={`${INPUT_CLASS} mt-1.5`}
            >
              {SERVICE_STATUS_ORDER.map((item) => (
                <option key={item} value={item}>
                  {SERVICE_STATUS_LABEL[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isComplaint}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsComplaint(checked);
                if (checked && status !== "CANCELLED") setStatus("COMPLAINT");
              }}
              className="mt-0.5 rounded border-slate-600 bg-slate-950 text-red-500"
            />
            <span>
              <span className="font-semibold text-red-300">
                Komplain / Retur Barang
              </span>
              <span className="mt-0.5 block text-xs text-slate-400">
                Bisa dicatat langsung tanpa menunggu status selesai. Untuk
                mitra, status partner otomatis menjadi retur komplain.
              </span>
            </span>
          </label>

          {isComplaint && (
            <label className="block text-sm text-slate-400">
              Nomor Tiket / Nota Servis Sebelumnya
              <input
                type="text"
                value={originalTicketNo}
                onChange={(e) => setOriginalTicketNo(e.target.value)}
                placeholder={`Kosongkan jika komplain pada ${ticket.ticketNo}`}
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>
          )}

          <label className="block text-sm text-slate-400">
            Catatan Kerusakan / Keluhan
            <textarea
              required
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className={`${INPUT_CLASS} mt-1.5 resize-y`}
            />
          </label>

          <label className="block text-sm text-slate-400">
            Catatan Pengerjaan (Teknisi / Mitra)
            <textarea
              rows={4}
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
              placeholder="Diagnosa, sparepart, catatan tambahan mitra…"
              className={`${INPUT_CLASS} mt-1.5 resize-y`}
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
            disabled={isSaving}
            className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {isSaving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
