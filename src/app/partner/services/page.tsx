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
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function ComplaintBadgeLocal() {
  return <ComplaintBadge label="Unit Komplain / Garansi" />;
}

type PartnerFilterStatus =
  | "ALL"
  | "IN_TRANSIT"
  | "RECEIVED_BY_PARTNER"
  | "REPAIRED"
  | "COMPLAINT";

function PartnerServicesContent() {
  const searchParams = useSearchParams();
  const {
    partners,
    partnersLoading,
    services,
    servicesLoading,
    servicesError,
    refreshServices,
    confirmPartnerReceived,
    updateServicePartnerFee,
    markServiceRepaired,
    sendServiceReturnToStore,
  } = useApp();

  const [activePartnerId, setActivePartnerId] = useState("");
  const [feeModalTicket, setFeeModalTicket] = useState<ServiceTicket | null>(null);
  const [partnerFeeInput, setPartnerFeeInput] = useState("");
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [markRepaired, setMarkRepaired] = useState(false);
  const [markComplaintReturn, setMarkComplaintReturn] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PartnerFilterStatus>("ALL");

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

  // All tickets belonging to this partner
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

  // Statistics for badges & metrics
  const filterCounts = useMemo(() => {
    let inTransit = 0;
    let received = 0;
    let repaired = 0;
    let complaint = 0;

    for (const t of partnerTickets) {
      if (t.isComplaint || t.status === "COMPLAINT" || t.partnerStatus === "COMPLAINT_RETURN") {
        complaint++;
      }
      if (t.partnerStatus === "IN_TRANSIT") inTransit++;
      if (t.partnerStatus === "RECEIVED_BY_PARTNER") received++;
      if (t.partnerStatus === "REPAIRED") repaired++;
    }

    return {
      all: partnerTickets.length,
      inTransit,
      received,
      repaired,
      complaint,
    };
  }, [partnerTickets]);

  // Filtered tickets based on search query & status filter
  const filteredTickets = useMemo(() => {
    return partnerTickets.filter((ticket) => {
      // Status Filter
      if (statusFilter === "IN_TRANSIT" && ticket.partnerStatus !== "IN_TRANSIT") {
        return false;
      }
      if (
        statusFilter === "RECEIVED_BY_PARTNER" &&
        ticket.partnerStatus !== "RECEIVED_BY_PARTNER"
      ) {
        return false;
      }
      if (statusFilter === "REPAIRED" && ticket.partnerStatus !== "REPAIRED") {
        return false;
      }
      if (
        statusFilter === "COMPLAINT" &&
        !ticket.isComplaint &&
        ticket.status !== "COMPLAINT" &&
        ticket.partnerStatus !== "COMPLAINT_RETURN"
      ) {
        return false;
      }

      // Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchDevice = ticket.deviceName.toLowerCase().includes(q);
      const matchTicketNo = ticket.ticketNo.toLowerCase().includes(q);
      const matchCustomer = ticket.customerName.toLowerCase().includes(q);
      const matchPhone = ticket.customerPhone.toLowerCase().includes(q);
      const matchSerial = ticket.serialNumber?.toLowerCase().includes(q) ?? false;
      const matchProblem = ticket.problem.toLowerCase().includes(q);
      const matchNotes = ticket.workNotes?.toLowerCase().includes(q) ?? false;

      return (
        matchDevice ||
        matchTicketNo ||
        matchCustomer ||
        matchPhone ||
        matchSerial ||
        matchProblem ||
        matchNotes
      );
    });
  }, [partnerTickets, statusFilter, searchQuery]);

  function handlePartnerChange(partnerId: string) {
    setActivePartnerId(partnerId);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(PARTNER_SESSION_KEY, partnerId);
    }
  }

  function handleResetFilters() {
    setSearchQuery("");
    setStatusFilter("ALL");
  }

  async function handleConfirmReceived(ticket: ServiceTicket) {
    const ok = window.confirm(
      `Konfirmasi unit ${ticket.ticketNo} (${ticket.deviceName}) sudah diterima di toko mitra?`,
    );
    if (!ok) return;
    try {
      await confirmPartnerReceived(ticket.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal konfirmasi penerimaan.",
      );
    }
  }

  function openFeeModal(ticket: ServiceTicket) {
    setFeeModalTicket(ticket);
    setPartnerFeeInput(ticket.partnerFee > 0 ? String(ticket.partnerFee) : "");
    setDiagnosisNote(ticket.workNotes ?? "");
    setMarkRepaired(ticket.partnerStatus === "REPAIRED");
    setMarkComplaintReturn(
      ticket.status === "COMPLAINT" ||
        ticket.partnerStatus === "COMPLAINT_RETURN",
    );
  }

  async function handleSaveFee() {
    if (!feeModalTicket) return;
    try {
      await updateServicePartnerFee(
        feeModalTicket.id,
        parseRupiahInput(partnerFeeInput),
        markComplaintReturn ? "COMPLAINT" : feeModalTicket.status,
        {
          workNotes: diagnosisNote,
          markComplaintReturn,
        },
      );
      if (markRepaired && !markComplaintReturn) {
        await markServiceRepaired(feeModalTicket.id);
      }
      setFeeModalTicket(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal memperbarui biaya.",
      );
    }
  }

  async function handleSendReturn(ticket: ServiceTicket) {
    const ok = window.confirm(
      `Kirim balik unit ${ticket.ticketNo} (${ticket.deviceName}) ke toko utama?`,
    );
    if (!ok) return;
    try {
      await sendServiceReturnToStore(ticket.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal mengirim balik unit.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* Header Portal Mitra */}
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700 border border-indigo-200">
                Portal Mitra Servis
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Akses Khusus Mitra
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
              {activePartner?.name ?? "Pilih Toko Mitra"}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Daftar tiket dan unit servis komputer/perangkat yang ditugaskan ke mitra Anda.
            </p>
          </div>

          <div className="min-w-[240px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Ganti Identitas Mitra
            </label>
            <select
              value={activePartnerId}
              onChange={(e) => handlePartnerChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Banner Galat */}
        {servicesError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{servicesError}</span>
            </div>
            <button
              type="button"
              onClick={() => void refreshServices()}
              className="rounded-xl border border-red-300 bg-white px-3.5 py-1.5 text-xs font-bold text-red-800 shadow-sm hover:bg-red-50 transition"
            >
              Muat Ulang
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {(partnersLoading || servicesLoading) && (
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-bold text-indigo-900 shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
            <span>Memuat data tiket servis mitra...</span>
          </div>
        )}

        {/* Notice Area Terisolasi */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950 shadow-sm">
          <svg className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong className="font-bold text-amber-950">Area Terisolasi:</strong> Informasi transaksi penjualan,
            keuangan kas toko, dan servis internal terlindungi dan tidak ditampilkan di portal ini.
          </div>
        </div>

        {/* Warning Komplain Jika Ada */}
        {partnerTickets.some((t) => t.isComplaint) && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-950 shadow-sm">
            <svg className="h-5 w-5 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-bold text-red-950">Ada Unit Servis Komplain / Garansi Ulang</p>
              <p className="mt-0.5 text-red-900">
                Periksa tiket dengan penanda merah. Pastikan tidak ada klaim ongkos ganda kecuali penggantian komponen baru yang disetujui toko utama.
              </p>
            </div>
          </div>
        )}

        {/* Kotak Pencarian & Filter Status */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Input Pencarian Nama Item / Perangkat */}
            <div className="relative flex-1">
              <label htmlFor="search-item-input" className="sr-only">
                Cari Nama Item atau Perangkat
              </label>
              <input
                id="search-item-input"
                type="text"
                placeholder="Cari berdasarkan nama item, perangkat, nomor tiket, atau pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
              />
              <svg
                className="absolute left-3.5 top-3 h-4 w-4 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  title="Hapus pencarian"
                  className="absolute right-3 top-2.5 rounded-full p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Total Count Ringkas */}
            <div className="shrink-0 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-xl text-center sm:text-right">
              Menampilkan <span className="text-indigo-700">{filteredTickets.length}</span> dari{" "}
              <span className="text-slate-900">{partnerTickets.length}</span> unit
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 mr-1">
              Filter Status:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              Semua ({filterCounts.all})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("IN_TRANSIT")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "IN_TRANSIT"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span>Perlu Dikonfirmasi</span>
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-800">
                {filterCounts.inTransit}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("RECEIVED_BY_PARTNER")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "RECEIVED_BY_PARTNER"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span>Dalam Pengerjaan</span>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-extrabold text-blue-800">
                {filterCounts.received}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("REPAIRED")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "REPAIRED"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span>Selesai Dikerjakan</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-800">
                {filterCounts.repaired}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("COMPLAINT")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === "COMPLAINT"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              <span>Garansi / Komplain</span>
              <span className="rounded-full bg-rose-200 px-1.5 py-0.2 text-[10px] font-extrabold text-rose-900">
                {filterCounts.complaint}
              </span>
            </button>

            {(searchQuery || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-indigo-700 hover:text-indigo-900 underline underline-offset-2 transition"
              >
                Reset Filter
              </button>
            )}
          </div>
        </section>

        {/* Tabel Data Tiket Servis Mitra */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <tr>
                <th className="px-4 py-3.5 text-left">No. Tiket</th>
                <th className="px-4 py-3.5 text-left">Pelanggan</th>
                <th className="px-4 py-3.5 text-left">Nama Item & Keluhan</th>
                <th className="px-4 py-3.5 text-left">Status Servis</th>
                <th className="px-4 py-3.5 text-right">Biaya Mitra</th>
                <th className="px-4 py-3.5 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {servicesLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-semibold text-slate-600">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2 align-middle" />
                    Memuat data servis...
                  </td>
                </tr>
              ) : partnerTickets.length === 0 ? (
                /* Empty state: Belum ada tiket di mitra ini */
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <p className="mt-3 text-base font-bold text-slate-800">
                      Belum Ada Tiket Servis
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Belum ada perangkat servis yang ditugaskan ke mitra ini oleh toko utama.
                    </p>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                /* Empty state: Hasil pencarian / filter kosong */
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-base font-bold text-slate-800">
                      Item atau Tiket Tidak Ditemukan
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600 max-w-md mx-auto">
                      Tidak ada hasil yang sesuai dengan kata kunci{" "}
                      {searchQuery ? <strong className="text-slate-900 font-bold">"{searchQuery}"</strong> : "filter"}
                      {statusFilter !== "ALL" ? ` pada kategori status tersebut.` : "."}
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Filter & Tampilkan Semua
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      ticket.isComplaint ? "bg-red-50/40" : ""
                    }`}
                  >
                    {/* No. Tiket */}
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-mono font-bold text-indigo-700 text-sm">
                        {ticket.ticketNo}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {formatTimestamp(ticket.updatedAt)}
                      </p>
                      {ticket.isComplaint && (
                        <div className="mt-1.5">
                          <ComplaintBadgeLocal />
                        </div>
                      )}
                    </td>

                    {/* Pelanggan */}
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-bold text-slate-900 text-sm">
                        {ticket.customerName}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {ticket.customerPhone}
                      </p>
                    </td>

                    {/* Nama Item / Perangkat & Keluhan */}
                    <td className="px-4 py-3.5 align-top max-w-xs">
                      <p className="font-bold text-slate-900 text-sm">
                        {ticket.deviceName}
                      </p>
                      {ticket.serialNumber && (
                        <p className="mt-0.5 inline-block font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          SN: {ticket.serialNumber}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-medium text-slate-700 leading-relaxed">
                        <strong className="text-slate-800">Keluhan:</strong> {ticket.problem}
                      </p>
                      {ticket.workNotes?.trim() && (
                        <div className="mt-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 p-2 text-xs font-semibold text-indigo-900">
                          Catatan Mitra: {ticket.workNotes}
                        </div>
                      )}
                      {ticket.isComplaint && getComplaintWarning(ticket) && (
                        <div className="mt-2 rounded-xl border border-red-300 bg-red-50 p-2 text-xs font-bold text-red-900">
                          {getComplaintWarning(ticket)}
                        </div>
                      )}
                    </td>

                    {/* Status Servis & Mitra */}
                    <td className="px-4 py-3.5 align-top space-y-1.5">
                      <div>
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${SERVICE_STATUS_BADGE[ticket.status]}`}
                        >
                          {SERVICE_STATUS_LABEL[ticket.status]}
                        </span>
                      </div>
                      {ticket.partnerStatus && (
                        <div>
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${PARTNER_STATUS_BADGE[ticket.partnerStatus]}`}
                          >
                            {PARTNER_STATUS_LABEL[ticket.partnerStatus]}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Biaya Mitra */}
                    <td className="px-4 py-3.5 align-top text-right">
                      <p className="font-extrabold text-slate-900 text-base">
                        {formatRupiah(ticket.partnerFee)}
                      </p>
                      {ticket.isComplaint && (
                        <p className="mt-1 text-xs font-bold text-red-700">
                          Garansi (Cek Ongkos)
                        </p>
                      )}
                    </td>

                    {/* Aksi Cepat */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex flex-col items-center gap-2">
                        {ticket.partnerStatus === "IN_TRANSIT" && (
                          <button
                            type="button"
                            onClick={() => handleConfirmReceived(ticket)}
                            className="w-full rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                          >
                            Konfirmasi Terima Unit
                          </button>
                        )}
                        {(ticket.partnerStatus === "RECEIVED_BY_PARTNER" ||
                          ticket.partnerStatus === "REPAIRED" ||
                          ticket.partnerStatus === "IN_TRANSIT" ||
                          ticket.partnerStatus === "COMPLAINT_RETURN") && (
                          <button
                            type="button"
                            onClick={() => openFeeModal(ticket)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-100 hover:border-slate-400 transition"
                          >
                            Update Catatan & Biaya
                          </button>
                        )}
                        {(ticket.partnerStatus === "REPAIRED" ||
                          ticket.partnerStatus === "RECEIVED_BY_PARTNER" ||
                          ticket.partnerStatus === "COMPLAINT_RETURN") && (
                          <button
                            type="button"
                            onClick={() => handleSendReturn(ticket)}
                            className="w-full rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
                          >
                            Kirim Balik ke Toko
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

      {/* Modal Dialog: Update Catatan, Biaya & Status */}
      {feeModalTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-fee-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Tutup modal"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setFeeModalTicket(null)}
          />

          {/* Modal Container (Clean Light Theme) */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
              <div>
                <h2
                  id="partner-fee-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Update Catatan & Biaya Servis
                </h2>
                <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                  Tiket: {feeModalTicket.ticketNo} &bull; {feeModalTicket.deviceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeeModalTicket(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <span className="sr-only">Tutup</span>
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-6 py-5">
              {feeModalTicket.isComplaint && (
                <div className="space-y-2">
                  <ComplaintBadgeLocal />
                  <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-950">
                    <p className="font-bold text-red-950">
                      Peringatan Garansi / Anti Double-Payment:
                    </p>
                    <p className="mt-0.5">
                      {getComplaintWarning(feeModalTicket)}
                    </p>
                  </div>
                </div>
              )}

              {/* Input Ongkos Servis Mitra */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ongkos Servis Mitra (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={partnerFeeInput}
                  onChange={(e) => setPartnerFeeInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                {feeModalTicket.isComplaint ? (
                  <span className="mt-1 block text-xs font-semibold text-red-700">
                    Unit garansi — isi Rp 0 kecuali ada komponen tambahan yang disetujui toko utama.
                  </span>
                ) : (
                  <span className="mt-1 block text-xs font-medium text-slate-600">
                    Nominal tagihan pengerjaan yang akan dibayarkan toko utama ke mitra.
                  </span>
                )}
              </div>

              {/* Catatan Pengerjaan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Catatan Pengerjaan / Diagnosa Mitra
                </label>
                <textarea
                  rows={4}
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  placeholder="Tuliskan hasil diagnosa, sparepart yang diganti, atau kendala pengerjaan..."
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y"
                />
              </div>

              {/* Checkbox Retur Komplain */}
              <label className="flex items-start gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={markComplaintReturn}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setMarkComplaintReturn(checked);
                    if (checked) setMarkRepaired(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="block text-slate-900">Retur komplain ke toko utama</span>
                  <span className="block text-xs font-medium text-slate-600 mt-0.5">
                    Gunakan jika unit tidak bisa diselesaikan atau harus dikembalikan langsung ke toko.
                  </span>
                </div>
              </label>

              {/* Checkbox Selesai Diperbaiki */}
              <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={markRepaired}
                  disabled={markComplaintReturn}
                  onChange={(e) => setMarkRepaired(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                />
                <span className={markComplaintReturn ? "text-slate-400" : "text-slate-900"}>
                  Tandai unit sudah selesai diperbaiki
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setFeeModalTicket(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveFee}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition"
              >
                Simpan Perubahan
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700 font-bold text-sm">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2.5" />
          Memuat portal mitra…
        </div>
      }
    >
      <PartnerServicesContent />
    </Suspense>
  );
}
