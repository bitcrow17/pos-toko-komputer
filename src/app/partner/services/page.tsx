"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getComplaintWarning,
  PARTNER_STATUS_BADGE,
  PARTNER_STATUS_LABEL,
  SERVICE_STATUS_BADGE,
  SERVICE_STATUS_LABEL,
} from "@/lib/service";
import { INPUT_CLASS, TABLE_BODY_CLASS, TABLE_CLASS, TABLE_HEAD_CLASS, TABLE_WRAPPER_CLASS } from "@/lib/ui-classes";
import ComplaintBadge from "@/src/components/ui/ComplaintBadge";
import { useApp } from "@/src/context/AppContext";
import type { ServiceTicket } from "@/types/service";

const PARTNER_SESSION_KEY = "retail-komputer-partner-id";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const INPUT_CLASS_LOCAL = INPUT_CLASS;

function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function ComplaintBadgeLocal() {
  return <ComplaintBadge label="Unit Komplain / Garansi" />;
}

function PartnerServicesContent() {
  const searchParams = useSearchParams();
  const {
    partners,
    services,
    confirmPartnerReceived,
    updateServicePartnerFee,
    markServiceRepaired,
    sendServiceReturnToStore,
  } = useApp();

  const [activePartnerId, setActivePartnerId] = useState("");
  const [feeModalTicket, setFeeModalTicket] = useState<ServiceTicket | null>(
    null,
  );
  const [partnerFeeInput, setPartnerFeeInput] = useState("");
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [markRepaired, setMarkRepaired] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("partnerId")?.trim();
    const fromSession =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(PARTNER_SESSION_KEY)
        : null;
    const initial = fromUrl || fromSession || partners[0]?.id || "";
    setActivePartnerId(initial);
    if (initial && typeof window !== "undefined") {
      window.sessionStorage.setItem(PARTNER_SESSION_KEY, initial);
    }
  }, [searchParams, partners]);

  const activePartner = useMemo(
    () => partners.find((p) => p.id === activePartnerId),
    [partners, activePartnerId],
  );

  const partnerTickets = useMemo(() => {
    if (!activePartnerId) return [];
    return services
      .filter(
        (ticket) =>
          ticket.handlingType === "PARTNER" &&
          ticket.partnerId === activePartnerId,
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [services, activePartnerId]);

  function handlePartnerChange(partnerId: string) {
    setActivePartnerId(partnerId);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PARTNER_SESSION_KEY, partnerId);
    }
  }

  function handleConfirmReceived(ticket: ServiceTicket) {
    const ok = window.confirm(
      `Konfirmasi unit ${ticket.ticketNo} sudah diterima di toko mitra?`,
    );
    if (!ok) return;
    try {
      confirmPartnerReceived(ticket.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal konfirmasi penerimaan.",
      );
    }
  }

  function openFeeModal(ticket: ServiceTicket) {
    setFeeModalTicket(ticket);
    setPartnerFeeInput(ticket.partnerFee > 0 ? String(ticket.partnerFee) : "");
    setDiagnosisNote(ticket.problem);
    setMarkRepaired(ticket.partnerStatus === "REPAIRED");
  }

  function handleSaveFee() {
    if (!feeModalTicket) return;
    try {
      updateServicePartnerFee(
        feeModalTicket.id,
        parseRupiahInput(partnerFeeInput),
        "PROCESSING",
      );
      if (markRepaired) {
        markServiceRepaired(feeModalTicket.id);
      }
      setFeeModalTicket(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal memperbarui biaya.",
      );
    }
  }

  function handleSendReturn(ticket: ServiceTicket) {
    const ok = window.confirm(
      `Kirim balik unit ${ticket.ticketNo} ke toko utama?`,
    );
    if (!ok) return;
    try {
      sendServiceReturnToStore(ticket.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal mengirim balik unit.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Portal Mitra Servis
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-800">
              {activePartner?.name ?? "Pilih Toko Mitra"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Hanya menampilkan tiket servis yang ditugaskan ke mitra Anda.
            </p>
          </div>

          <label className="block min-w-[220px] text-sm font-medium text-slate-600">
            Identitas Mitra
            <select
              value={activePartnerId}
              onChange={(e) => handlePartnerChange(e.target.value)}
              className={`${INPUT_CLASS_LOCAL} mt-1.5`}
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Area terisolasi: data servis internal, transaksi penjualan, dan
          informasi keuangan toko utama tidak ditampilkan di portal ini.
        </div>

        {partnerTickets.some((t) => t.isComplaint) && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Ada unit komplain / garansi di daftar Anda</p>
            <p className="mt-1">
              Pastikan tidak ada klaim ongkos ganda untuk unit berlabel merah.
            </p>
          </div>
        )}

        <div className={TABLE_WRAPPER_CLASS}>
          <table className={TABLE_CLASS}>
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-400">
                  Tiket
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">
                  Perangkat & Keluhan
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-400">
                  Biaya Mitra
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-400">
                  Aksi Cepat
                </th>
              </tr>
            </thead>
            <tbody className={TABLE_BODY_CLASS}>
              {partnerTickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Belum ada tiket servis untuk mitra ini.
                  </td>
                </tr>
              ) : (
                partnerTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`hover:bg-slate-50 ${
                      ticket.isComplaint ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-indigo-700">
                        {ticket.ticketNo}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTimestamp(ticket.updatedAt)}
                      </p>
                      {ticket.isComplaint && (
                        <div className="mt-1.5">
                          <ComplaintBadgeLocal />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">
                        {ticket.customerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ticket.customerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-200">{ticket.deviceName}</p>
                      {ticket.serialNumber && (
                        <p className="font-mono text-xs text-slate-500">
                          {ticket.serialNumber}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {ticket.problem}
                      </p>
                      {ticket.isComplaint && getComplaintWarning(ticket) && (
                        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-medium text-red-200">
                          {getComplaintWarning(ticket)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${SERVICE_STATUS_BADGE[ticket.status]}`}
                      >
                        {SERVICE_STATUS_LABEL[ticket.status]}
                      </span>
                      {ticket.partnerStatus && (
                        <span
                          className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${PARTNER_STATUS_BADGE[ticket.partnerStatus]}`}
                        >
                          {PARTNER_STATUS_LABEL[ticket.partnerStatus]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatRupiah(ticket.partnerFee)}
                      {ticket.isComplaint && (
                        <p className="mt-1 text-[11px] text-red-300">
                          Garansi — cek ongkos ganda
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        {ticket.partnerStatus === "IN_TRANSIT" && (
                          <button
                            type="button"
                            onClick={() => handleConfirmReceived(ticket)}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                          >
                            Konfirmasi Terima Unit
                          </button>
                        )}
                        {(ticket.partnerStatus === "RECEIVED_BY_PARTNER" ||
                          ticket.partnerStatus === "REPAIRED" ||
                          ticket.partnerStatus === "IN_TRANSIT") && (
                          <button
                            type="button"
                            onClick={() => openFeeModal(ticket)}
                            className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                          >
                            Update Biaya & Diagnosa
                          </button>
                        )}
                        {(ticket.partnerStatus === "REPAIRED" ||
                          ticket.partnerStatus === "RECEIVED_BY_PARTNER") && (
                          <button
                            type="button"
                            onClick={() => handleSendReturn(ticket)}
                            className="rounded-lg bg-orange-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-500"
                          >
                            Kirim Balik ke Toko Utama
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {feeModalTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-fee-title"
        >
          <button
            type="button"
            aria-label="Tutup modal"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setFeeModalTicket(null)}
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2
                id="partner-fee-title"
                className="text-lg font-semibold text-white"
              >
                Update Biaya & Diagnosa
              </h2>
              <p className="text-sm text-slate-400">{feeModalTicket.ticketNo}</p>
            </div>

            <div className="space-y-4 px-5 py-4">
              {feeModalTicket.isComplaint && (
                <div className="space-y-2">
                  <ComplaintBadgeLocal />
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <p className="font-semibold text-red-100">
                      Peringatan Anti Double-Payment
                    </p>
                    <p className="mt-0.5">
                      {getComplaintWarning(feeModalTicket)}
                    </p>
                  </div>
                </div>
              )}

              <label className="block text-sm text-slate-400">
                Ongkos Servis Mitra (Rp)
                <input
                  type="text"
                  inputMode="numeric"
                  value={partnerFeeInput}
                  onChange={(e) => setPartnerFeeInput(e.target.value)}
                  className={`${INPUT_CLASS_LOCAL} mt-1.5`}
                />
                {feeModalTicket.isComplaint && (
                  <span className="mt-1 block text-xs text-red-300">
                    Unit garansi — isi Rp 0 kecuali ada komponen tambahan yang
                    disetujui toko utama.
                  </span>
                )}
              </label>
              <label className="block text-sm text-slate-400">
                Catatan Diagnosa
                <textarea
                  rows={3}
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  className={`${INPUT_CLASS} mt-1.5 resize-none`}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={markRepaired}
                  onChange={(e) => setMarkRepaired(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-950 text-cyan-600"
                />
                Tandai unit selesai diperbaiki
              </label>
            </div>

            <div className="flex gap-3 border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setFeeModalTicket(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveFee}
                className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartnerServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Memuat portal mitra…
        </div>
      }
    >
      <PartnerServicesContent />
    </Suspense>
  );
}
