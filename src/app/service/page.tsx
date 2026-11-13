"use client";

import { useMemo, useState } from "react";
import ModuleNav from "@/src/components/ModuleNav";
import {
  HANDLING_TYPE_LABEL,
  getComplaintWarning,
  PARTNER_STATUS_BADGE,
  PARTNER_STATUS_LABEL,
  SERVICE_STATUS_BADGE,
  SERVICE_STATUS_LABEL,
  SERVICE_STATUS_ORDER,
  SERVICE_ACCESSORY_LABEL,
  parseServiceAccessories,
} from "@/lib/service";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_CLASS,
  SELECT_CLASS,
  TABLE_BODY_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
  TABLE_WRAPPER_CLASS,
  TAB_GROUP_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import ComplaintBadge from "@/src/components/ui/ComplaintBadge";
import CustomerAutocomplete from "@/src/components/CustomerAutocomplete";
import PartnerFormModal from "@/src/components/PartnerFormModal";
import ServiceFormModal from "@/src/components/ServiceFormModal";
import ServiceIntakeReceiptModal from "@/src/components/ServiceIntakeReceiptModal";
import ServiceManifestModal from "@/src/components/ServiceManifestModal";
import ServicePickupReceiptModal from "@/src/components/ServicePickupReceiptModal";
import ServiceTicketEditModal from "@/src/components/ServiceTicketEditModal";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import { useApp } from "@/src/context/AppContext";
import { useToast } from "@/src/components/ui/Toast";
import type {
  Partner,
  PartnerInput,
  ServiceAccessory,
  ServiceStatus,
  ServiceTicket,
  ServiceTicketInput,
} from "@/types/service";
import type { PaymentMethod, Transaction } from "@/types/transaction";

type ServiceTab = "list" | "intake" | "checkout";

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

function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

const ACCESSORY_OPTIONS: ServiceAccessory[] = ["UNIT", "CHARGER", "BOX"];

export default function ServicePage() {
  const {
    services,
    servicesLoading,
    servicesError,
    partners,
    addService,
    updateService,
    deleteService,
    addPartner,
    updatePartner,
    sendServiceToPartner,
    confirmServiceReturned,
    collectServicePayment,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ServiceTab>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [handlingFilter, setHandlingFilter] = useState<"ALL" | "INTERNAL" | "PARTNER">("ALL");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "ALL">("ALL");

  // Modals state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [manifestTicket, setManifestTicket] = useState<ServiceTicket | null>(null);
  const [intakeReceipt, setIntakeReceipt] = useState<{
    ticket: ServiceTicket;
    variant: "created" | "reprint";
  } | null>(null);
  const [editingTicket, setEditingTicket] = useState<ServiceTicket | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Quick Intake Form state (when on 'intake' tab)
  const [intakeCustomerName, setIntakeCustomerName] = useState("");
  const [intakeCustomerPhone, setIntakeCustomerPhone] = useState("");
  const [intakeDeviceName, setIntakeDeviceName] = useState("");
  const [intakeSerialNumber, setIntakeSerialNumber] = useState("");
  const [intakeProblem, setIntakeProblem] = useState("");
  const [intakeHandlingType, setIntakeHandlingType] = useState<"INTERNAL" | "PARTNER">("INTERNAL");
  const [intakePartnerId, setIntakePartnerId] = useState(partners[0]?.id ?? "");
  const [intakeCustomerFeeInput, setIntakeCustomerFeeInput] = useState("");
  const [intakeIsComplaint, setIntakeIsComplaint] = useState(false);
  const [intakeOriginalTicketNo, setIntakeOriginalTicketNo] = useState("");
  const [intakeAccessories, setIntakeAccessories] = useState<ServiceAccessory[]>(["UNIT"]);
  const [intakeEstCompletion, setIntakeEstCompletion] = useState("");
  const [isSavingIntake, setIsSavingIntake] = useState(false);

  // Checkout Payment state
  const [payTicket, setPayTicket] = useState<ServiceTicket | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [payCashInput, setPayCashInput] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pickupReceipt, setPickupReceipt] = useState<{
    ticket: ServiceTicket;
    transaction: Transaction;
  } | null>(null);

  const partnerById = useMemo(() => {
    const map = new Map<string, Partner>();
    for (const partner of partners) {
      map.set(partner.id, partner);
    }
    return map;
  }, [partners]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services
      .filter((ticket) => {
        if (handlingFilter !== "ALL" && ticket.handlingType !== handlingFilter) {
          return false;
        }
        if (statusFilter !== "ALL" && ticket.status !== statusFilter) {
          return false;
        }
        if (!q) return true;
        const partnerName =
          ticket.partnerId && partnerById.get(ticket.partnerId)?.name;
        return (
          ticket.ticketNo.toLowerCase().includes(q) ||
          ticket.customerName.toLowerCase().includes(q) ||
          ticket.customerPhone.toLowerCase().includes(q) ||
          ticket.deviceName.toLowerCase().includes(q) ||
          (partnerName?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [services, searchQuery, handlingFilter, statusFilter, partnerById]);

  // Statistics
  const stats = useMemo(() => {
    const total = services.length;
    const inProgress = services.filter(
      (s) => s.status === "QUEUED" || s.status === "PROCESSING",
    ).length;
    const readyPickup = services.filter(
      (s) =>
        !s.isPaid &&
        (s.status === "COMPLETED" || s.partnerStatus === "RETURNED_TO_STORE"),
    ).length;
    const complaints = services.filter((s) => s.isComplaint).length;
    const totalRevenue = services
      .filter((s) => s.isPaid)
      .reduce((acc, curr) => acc + (curr.customerFee || 0), 0);

    return { total, inProgress, readyPickup, complaints, totalRevenue };
  }, [services]);

  // Tickets ready for checkout/pickup
  const readyForPickupTickets = useMemo(() => {
    return services.filter(
      (s) =>
        !s.isPaid &&
        (s.status === "COMPLETED" || s.partnerStatus === "RETURNED_TO_STORE"),
    );
  }, [services]);

  // Intake accessory toggle
  function toggleAccessory(acc: ServiceAccessory) {
    setIntakeAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc],
    );
  }

  // Handle Quick Intake Submit
  async function handleQuickIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!intakeCustomerName.trim()) {
      showToast("Nama pelanggan wajib diisi.", "error");
      return;
    }
    if (!intakeCustomerPhone.trim()) {
      showToast("Nomor HP pelanggan wajib diisi.", "error");
      return;
    }
    if (!intakeDeviceName.trim()) {
      showToast("Nama/tipe perangkat wajib diisi.", "error");
      return;
    }
    if (!intakeProblem.trim()) {
      showToast("Keluhan kerusakan wajib diisi.", "error");
      return;
    }
    if (intakeHandlingType === "PARTNER" && !intakePartnerId) {
      showToast("Pilih mitra servis tujuan.", "error");
      return;
    }
    if (intakeIsComplaint && !intakeOriginalTicketNo.trim()) {
      showToast("Nomor tiket asal garansi wajib diisi.", "error");
      return;
    }

    setIsSavingIntake(true);
    try {
      const created = await addService({
        customerName: intakeCustomerName.trim(),
        customerPhone: intakeCustomerPhone.trim(),
        deviceName: intakeDeviceName.trim(),
        serialNumber: intakeSerialNumber.trim() || undefined,
        problem: intakeProblem.trim(),
        handlingType: intakeHandlingType,
        partnerId: intakeHandlingType === "PARTNER" ? intakePartnerId : undefined,
        customerFee: parseRupiahInput(intakeCustomerFeeInput),
        partnerFee: 0,
        status: "QUEUED",
        isComplaint: intakeIsComplaint,
        originalTicketNo: intakeIsComplaint ? intakeOriginalTicketNo.trim() : undefined,
        accessories: intakeAccessories,
        estimatedCompletionDate: intakeEstCompletion || undefined,
      });

      showToast(`Tiket servis ${created.ticketNo} berhasil dibuat!`, "success");
      setIntakeReceipt({ ticket: created, variant: "created" });

      // Reset form
      setIntakeCustomerName("");
      setIntakeCustomerPhone("");
      setIntakeDeviceName("");
      setIntakeSerialNumber("");
      setIntakeProblem("");
      setIntakeHandlingType("INTERNAL");
      setIntakeCustomerFeeInput("");
      setIntakeIsComplaint(false);
      setIntakeOriginalTicketNo("");
      setIntakeAccessories(["UNIT"]);
      setIntakeEstCompletion("");
      setActiveTab("list");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan tiket servis.", "error");
    } finally {
      setIsSavingIntake(false);
    }
  }

  // Status Change Handler
  async function handleStatusChange(ticket: ServiceTicket, nextStatus: ServiceStatus) {
    try {
      await updateService(ticket.id, { status: nextStatus });
      showToast(`Status ${ticket.ticketNo} diperbarui ke ${SERVICE_STATUS_LABEL[nextStatus]}`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Gagal memperbarui status.", "error");
    }
  }

  // Partner Workflow Handlers
  async function handleSendToPartner(ticket: ServiceTicket) {
    try {
      await sendServiceToPartner(ticket.id);
      const partner = ticket.partnerId ? partnerById.get(ticket.partnerId) : undefined;
      showToast(`Tiket ${ticket.ticketNo} dikirim ke mitra ${partner?.name ?? ""}`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim ke mitra.", "error");
    }
  }

  async function handleConfirmReturned(ticket: ServiceTicket) {
    try {
      await confirmServiceReturned(ticket.id);
      showToast(`Tiket ${ticket.ticketNo} telah kembali ke toko utama.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal konfirmasi pengembalian.", "error");
    }
  }

  // Delete ticket handler
  async function handleDeleteTicket(ticket: ServiceTicket) {
    const ok = window.confirm(`Hapus tiket servis "${ticket.ticketNo}" untuk ${ticket.customerName}?`);
    if (!ok) return;
    try {
      await deleteService(ticket.id);
      showToast(`Tiket ${ticket.ticketNo} berhasil dihapus.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus tiket servis.", "error");
    }
  }

  // Checkout Payment
  const checkoutCustomerFee = useMemo(() => {
    if (!payTicket) return 0;
    if (payTicket.isComplaint) return 0;
    return payTicket.customerFee ?? 0;
  }, [payTicket]);

  const checkoutCashPaid = parseRupiahInput(payCashInput);
  const checkoutChange = Math.max(0, checkoutCashPaid - checkoutCustomerFee);
  const isCashInsufficient = payMethod === "CASH" && checkoutCashPaid < checkoutCustomerFee;

  async function handleConfirmCheckoutPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payTicket) return;
    if (isCashInsufficient) {
      showToast("Nominal tunai kurang dari total biaya servis.", "error");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const tx = await collectServicePayment(payTicket.id, {
        paymentMethod: payMethod,
        nominalBayar: payMethod === "CASH" ? checkoutCashPaid : checkoutCustomerFee,
        customerFeeOverride: checkoutCustomerFee,
      });

      showToast(`Pelunasan & pengambilan servis ${payTicket.ticketNo} berhasil!`, "success");
      setPickupReceipt({ ticket: payTicket, transaction: tx });
      setPayTicket(null);
      setPayCashInput("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memproses pelunasan servis.", "error");
    } finally {
      setIsProcessingPayment(false);
    }
  }

  const manifestPartner = manifestTicket?.partnerId
    ? partnerById.get(manifestTicket.partnerId)
    : undefined;

  function handleServiceBarcodeScanned(scannedCode: string) {
    const code = scannedCode.trim();
    if (!code) return;

    // 1. Cari tiket yang cocok dengan ticketNo, serialNumber, atau customerPhone
    const match = services.find(
      (s) =>
        s.ticketNo.toLowerCase() === code.toLowerCase() ||
        (s.serialNumber && s.serialNumber.toLowerCase() === code.toLowerCase()) ||
        s.customerPhone === code,
    );

    setSearchQuery(code);
    setActiveTab("list");

    if (match) {
      setEditingTicket(match);
      showToast(
        `Tiket ditemukan: ${match.ticketNo} (${match.customerName})`,
        "success",
      );
    } else {
      showToast(`Mencari tiket dengan kata kunci: "${code}"`, "info");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 print:bg-white print:text-black">
      {/* Module Navigation Topbar */}
      <ModuleNav
        title="Manajemen Servis & Garansi"
        subtitle="Modul Servis Komputer"
        rightContent={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            {/* Sub Tabs */}
            <div className={TAB_GROUP_CLASS} role="tablist" aria-label="Tab Servis">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "list"}
                onClick={() => setActiveTab("list")}
                className={tabButtonClass(activeTab === "list", "violet")}
              >
                Daftar Tiket Servis
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "intake"}
                onClick={() => setActiveTab("intake")}
                className={tabButtonClass(activeTab === "intake", "violet")}
              >
                + Terima Servis Baru
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "checkout"}
                onClick={() => setActiveTab("checkout")}
                className={tabButtonClass(activeTab === "checkout", "violet")}
              >
                Pelunasan & Pengambilan
                {readyForPickupTickets.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    {readyForPickupTickets.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-xs transition hover:bg-violet-100"
                title="Pindai barcode / QR tiket servis via kamera HP"
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
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                </svg>
                Scan Barcode
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPartner(null);
                  setPartnerModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                Kelola Mitra ({partners.length})
              </button>
              <button
                type="button"
                onClick={() => setServiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-violet-700"
              >
                Modal Servis Cepat
              </button>
            </div>
          </div>
        }
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Metric Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Total Tiket</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
            <p className="text-xs font-medium text-amber-700">Dalam Pengerjaan</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{stats.inProgress}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
            <p className="text-xs font-medium text-emerald-700">Siap Diambil</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.readyPickup}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
            <p className="text-xs font-medium text-red-700">Komplain / Garansi</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{stats.complaints}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 shadow-xs sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-violet-700">Pendapatan Servis</p>
            <p className="mt-1 text-lg font-bold text-violet-900 truncate">
              {formatRupiah(stats.totalRevenue)}
            </p>
          </div>
        </div>

        {/* TAB 1: LIST TIKET SERVIS */}
        {activeTab === "list" && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Cari no tiket, pelanggan, no HP, perangkat, mitra..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${INPUT_CLASS} w-full pl-9`}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8" strokeWidth="2" />
                    <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-violet-700 shrink-0"
                  title="Buka kamera scan barcode tiket"
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
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                  </svg>
                  <span className="hidden sm:inline">Scan Tiket</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={handlingFilter}
                  onChange={(e) => setHandlingFilter(e.target.value as "ALL" | "INTERNAL" | "PARTNER")}
                  className={SELECT_CLASS}
                  aria-label="Filter jenis penanganan"
                >
                  <option value="ALL">Semua Penanganan</option>
                  <option value="INTERNAL">Internal Toko</option>
                  <option value="PARTNER">Mitra Luar</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | "ALL")}
                  className={SELECT_CLASS}
                  aria-label="Filter status tiket"
                >
                  <option value="ALL">Semua Status</option>
                  {SERVICE_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {SERVICE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error or Loading state */}
            {servicesLoading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Memuat data servis...
              </div>
            )}

            {servicesError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {servicesError}
              </div>
            )}

            {/* Tickets Table */}
            {!servicesLoading && (
              <div className={TABLE_WRAPPER_CLASS}>
                <table className={TABLE_CLASS}>
                  <thead className={TABLE_HEAD_CLASS}>
                    <tr>
                      <th className="px-4 py-3">No. Tiket</th>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3">Perangkat & Keluhan</th>
                      <th className="px-4 py-3">Penanganan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Biaya</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className={TABLE_BODY_CLASS}>
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                          {searchQuery || handlingFilter !== "ALL" || statusFilter !== "ALL"
                            ? "Tidak ada tiket servis yang cocok dengan filter."
                            : "Belum ada tiket servis. Klik tombol '+ Terima Servis Baru' untuk mulai."}
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((ticket) => {
                        const partner = ticket.partnerId ? partnerById.get(ticket.partnerId) : null;
                        const warning = getComplaintWarning(ticket);
                        const isReadyForPickup =
                          !ticket.isPaid &&
                          (ticket.status === "COMPLETED" ||
                            ticket.partnerStatus === "RETURNED_TO_STORE");

                        return (
                          <tr key={ticket.id} className={TABLE_ROW_CLASS}>
                            {/* Tiket No */}
                            <td className="px-4 py-3">
                              <p className="font-mono font-bold text-violet-700">
                                {ticket.ticketNo}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {formatTimestamp(ticket.createdAt)}
                              </p>
                              {ticket.isComplaint && (
                                <div className="mt-1">
                                  <ComplaintBadge />
                                </div>
                              )}
                              {ticket.isPaid && (
                                <span className="mt-1 inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  Lunas / Diambil
                                </span>
                              )}
                            </td>

                            {/* Customer */}
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{ticket.customerName}</p>
                              <p className="text-xs text-slate-500">{ticket.customerPhone}</p>
                            </td>

                            {/* Device & Problem */}
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-medium text-slate-800">{ticket.deviceName}</p>
                              {ticket.serialNumber && (
                                <p className="font-mono text-xs text-slate-500">
                                  SN: {ticket.serialNumber}
                                </p>
                              )}
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                                {ticket.problem}
                              </p>
                              {(() => {
                                const accList = Array.isArray(ticket.accessories)
                                  ? ticket.accessories
                                  : parseServiceAccessories(ticket.accessories);
                                return Array.isArray(accList) && accList.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {accList.map((acc) => (
                                      <span
                                        key={acc}
                                        className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600"
                                      >
                                        {SERVICE_ACCESSORY_LABEL[acc as ServiceAccessory] ?? acc}
                                      </span>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                              {warning && (
                                <p className="mt-1.5 rounded-md border border-red-200 bg-red-50 p-1 text-[11px] font-medium text-red-700">
                                  {warning}
                                </p>
                              )}
                            </td>

                            {/* Penanganan */}
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                {HANDLING_TYPE_LABEL[ticket.handlingType]}
                              </span>
                              {partner && (
                                <p className="mt-1 text-xs font-semibold text-violet-700">
                                  {partner.name}
                                </p>
                              )}
                              {ticket.partnerStatus && (
                                <span
                                  className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${PARTNER_STATUS_BADGE[ticket.partnerStatus]}`}
                                >
                                  {PARTNER_STATUS_LABEL[ticket.partnerStatus]}
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${SERVICE_STATUS_BADGE[ticket.status]}`}
                              >
                                {SERVICE_STATUS_LABEL[ticket.status]}
                              </span>
                              <select
                                value={ticket.status}
                                onChange={(e) =>
                                  handleStatusChange(ticket, e.target.value as ServiceStatus)
                                }
                                className="mt-2 block w-full max-w-[140px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-2xs"
                                aria-label={`Ubah status ${ticket.ticketNo}`}
                              >
                                {SERVICE_STATUS_ORDER.map((status) => (
                                  <option key={status} value={status}>
                                    {SERVICE_STATUS_LABEL[status]}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Biaya */}
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">
                                {ticket.isComplaint ? "Rp 0 (Garansi)" : formatRupiah(ticket.customerFee || 0)}
                              </p>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isReadyForPickup && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPayTicket(ticket);
                                      setPayCashInput(String(ticket.customerFee || 0));
                                    }}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                                  >
                                    Pelunasan
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingTicket(ticket)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIntakeReceipt({ ticket, variant: "reprint" })}
                                  title="Cetak Tanda Terima"
                                  className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 shadow-xs transition hover:bg-slate-50"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                  >
                                    <path d="M6 9V2h12v7" />
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                    <path d="M6 14h12v8H6z" />
                                  </svg>
                                </button>
                                {ticket.handlingType === "PARTNER" && (
                                  <button
                                    type="button"
                                    onClick={() => setManifestTicket(ticket)}
                                    title="Cetak Manifest Mitra"
                                    className="rounded-lg border border-violet-200 bg-violet-50 p-1 text-violet-700 shadow-xs transition hover:bg-violet-100"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      className="h-4 w-4"
                                    >
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <line x1="16" y1="13" x2="8" y2="13" />
                                      <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTicket(ticket)}
                                  title="Hapus Tiket"
                                  className="rounded-lg p-1 text-red-500 transition hover:bg-red-50"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-4 w-4"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TERIMA SERVIS BARU (INTAKE FORM) */}
        {activeTab === "intake" && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">Formulir Penerimaan Servis Masuk</h2>
              <p className="text-xs text-slate-500">
                Pencatatan unit komputer/laptop masuk dari pelanggan beserta keluhan kerusakan dan opsi garansi.
              </p>
            </div>

            <form onSubmit={handleQuickIntakeSubmit} className="mt-6 space-y-5">
              {/* Customer Autocomplete */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Data Pelanggan
                </p>
                <CustomerAutocomplete
                  name={intakeCustomerName}
                  phone={intakeCustomerPhone}
                  onNameChange={setIntakeCustomerName}
                  onPhoneChange={setIntakeCustomerPhone}
                  onCustomerSelect={(c) => {
                    setIntakeCustomerName(c.name);
                    setIntakeCustomerPhone(c.phone);
                  }}
                  nameRequired
                  phoneRequired
                  layout="grid"
                />
              </div>

              {/* Perangkat & Kerusakan */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Data Perangkat
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-700">
                    Perangkat / Model <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={intakeDeviceName}
                      onChange={(e) => setIntakeDeviceName(e.target.value)}
                      placeholder="e.g. Laptop Asus ROG G513, PC Rakitan"
                      className={`${INPUT_CLASS} w-full mt-1`}
                      required
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-700">
                    Nomor Seri (Serial Number)
                    <input
                      type="text"
                      value={intakeSerialNumber}
                      onChange={(e) => setIntakeSerialNumber(e.target.value)}
                      placeholder="SN opsional"
                      className={`${INPUT_CLASS} w-full mt-1`}
                    />
                  </label>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-700">
                    Keluhan / Gejala Kerusakan <span className="text-red-500">*</span>
                    <textarea
                      rows={2}
                      value={intakeProblem}
                      onChange={(e) => setIntakeProblem(e.target.value)}
                      placeholder="Deskripsikan kerusakan secara lengkap..."
                      className={`${INPUT_CLASS} w-full mt-1`}
                      required
                    />
                  </label>
                </div>

                {/* Kelengkapan Accessories */}
                <div className="mt-3">
                  <span className="text-xs font-medium text-slate-700">Kelengkapan Disertakan:</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {ACCESSORY_OPTIONS.map((acc) => {
                      const selected = intakeAccessories.includes(acc);
                      return (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => toggleAccessory(acc)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "bg-violet-600 text-white shadow-xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}
                          {SERVICE_ACCESSORY_LABEL[acc]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Opsi Penanganan & Garansi */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Penanganan & Biaya
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-700">
                    Jenis Penanganan
                    <select
                      value={intakeHandlingType}
                      onChange={(e) =>
                        setIntakeHandlingType(e.target.value as "INTERNAL" | "PARTNER")
                      }
                      className={`${SELECT_CLASS} w-full mt-1`}
                    >
                      <option value="INTERNAL">Internal Toko (Teknisi Sendiri)</option>
                      <option value="PARTNER">Kirim ke Mitra / Vendor Luar</option>
                    </select>
                  </label>

                  {intakeHandlingType === "PARTNER" && (
                    <label className="text-xs font-medium text-slate-700">
                      Pilih Mitra Tujuan <span className="text-red-500">*</span>
                      <select
                        value={intakePartnerId}
                        onChange={(e) => setIntakePartnerId(e.target.value)}
                        className={`${SELECT_CLASS} w-full mt-1`}
                        required
                      >
                        <option value="">-- Pilih Mitra --</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.phone})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="text-xs font-medium text-slate-700">
                    Estimasi Biaya ke Pelanggan (Rp)
                    <input
                      type="text"
                      value={intakeCustomerFeeInput}
                      onChange={(e) => setIntakeCustomerFeeInput(e.target.value)}
                      placeholder="0 jika belum ditentukan"
                      className={`${INPUT_CLASS} w-full mt-1`}
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-700">
                    Estimasi Selesai (Opsional)
                    <input
                      type="date"
                      value={intakeEstCompletion}
                      onChange={(e) => setIntakeEstCompletion(e.target.value)}
                      className={`${INPUT_CLASS} w-full mt-1`}
                    />
                  </label>
                </div>

                {/* Klaim Garansi Checkbox */}
                <div className="mt-4 border-t border-slate-200/60 pt-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={intakeIsComplaint}
                      onChange={(e) => setIntakeIsComplaint(e.target.checked)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span>Ini adalah klaim servis ulang / komplain garansi</span>
                  </label>

                  {intakeIsComplaint && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <label className="text-xs font-medium text-red-900">
                        Nomor Tiket Servis Asal <span className="text-red-500">*</span>
                        <input
                          type="text"
                          value={intakeOriginalTicketNo}
                          onChange={(e) => setIntakeOriginalTicketNo(e.target.value)}
                          placeholder="e.g. SRV-202611-0001"
                          className={`${INPUT_CLASS} w-full mt-1`}
                          required
                        />
                      </label>
                      <p className="mt-1.5 text-[11px] text-red-700">
                        Sistem anti double-payment aktif: Servis garansi tidak akan membebankan biaya ulang ke pelanggan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className={BTN_SECONDARY}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingIntake}
                  className={`${BTN_PRIMARY} bg-violet-600 hover:bg-violet-700`}
                >
                  {isSavingIntake ? "Menyimpan & Cetak..." : "Simpan & Cetak Tanda Terima"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: PELUNASAN & PENGAMBILAN (CHECKOUT) */}
        {activeTab === "checkout" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-slate-800">
                Unit Siap Diambil & Menunggu Pelunasan
              </h2>
              <p className="text-xs text-slate-500">
                Pilih tiket untuk memproses pembayaran dan mencetak nota pengambilan resmi bagi pelanggan.
              </p>
            </div>

            {readyForPickupTickets.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                Tidak ada tiket servis yang siap diambil atau menunggu pelunasan saat ini.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {readyForPickupTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-violet-700">
                          {ticket.ticketNo}
                        </span>
                        {ticket.isComplaint && <ComplaintBadge />}
                      </div>

                      <p className="mt-2 text-base font-bold text-slate-900">
                        {ticket.customerName}
                      </p>
                      <p className="text-xs text-slate-500">{ticket.customerPhone}</p>

                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs">
                        <p className="font-medium text-slate-800">{ticket.deviceName}</p>
                        <p className="text-slate-600 line-clamp-1">{ticket.problem}</p>
                        {ticket.workNotes && (
                          <p className="mt-1 text-violet-700 font-medium line-clamp-1">
                            Catatan: {ticket.workNotes}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-xs text-slate-500">Total Biaya:</span>
                        <span className="text-base font-bold text-slate-900">
                          {ticket.isComplaint ? "Rp 0 (Garansi)" : formatRupiah(ticket.customerFee || 0)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPayTicket(ticket);
                        setPayCashInput(String(ticket.customerFee || 0));
                      }}
                      className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
                    >
                      Proses Pelunasan & Ambil
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL CHECKOUT PELUNASAN */}
      {payTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Pelunasan Servis
                </p>
                <h3 className="text-lg font-bold text-slate-800">
                  Tiket {payTicket.ticketNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayTicket(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCheckoutPayment} className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-800">{payTicket.customerName} ({payTicket.customerPhone})</p>
                <p className="text-slate-600">{payTicket.deviceName} - {payTicket.problem}</p>
                {payTicket.isComplaint && (
                  <p className="mt-1 text-red-600 font-semibold">
                    Klaim Garansi: Anti double-payment (Biaya Rp 0)
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Metode Pembayaran</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["CASH", "TRANSFER", "QRIS"] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
                        payMethod === m
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {m === "CASH" ? "TUNAI" : m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Total Tagihan:</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatRupiah(checkoutCustomerFee)}
                  </span>
                </div>

                {payMethod === "CASH" && (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-medium text-slate-700">
                      Uang Tunai Diterima (Rp)
                      <input
                        type="text"
                        value={payCashInput}
                        onChange={(e) => setPayCashInput(e.target.value)}
                        className={`${INPUT_CLASS} w-full mt-1 font-mono font-bold text-base`}
                        autoFocus
                      />
                    </label>

                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">Kembalian:</span>
                      <span
                        className={
                          checkoutChange >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"
                        }
                      >
                        {formatRupiah(checkoutChange)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayTicket(null)}
                  className={BTN_SECONDARY}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment || isCashInsufficient}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-40"
                >
                  {isProcessingPayment ? "Memproses..." : "Konfirmasi & Ambil Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP NOTA MASUK (INTAKE RECEIPT) */}
      {intakeReceipt && (
        <ServiceIntakeReceiptModal
          ticket={intakeReceipt.ticket}
          variant={intakeReceipt.variant}
          onClose={() => setIntakeReceipt(null)}
        />
      )}

      {/* POPUP NOTA PENGAMBILAN (PICKUP RECEIPT) */}
      {pickupReceipt && (
        <ServicePickupReceiptModal
          ticket={pickupReceipt.ticket}
          transaction={pickupReceipt.transaction}
          onClose={() => setPickupReceipt(null)}
        />
      )}

      {/* MODAL EDIT TIKET */}
      {editingTicket && (
        <ServiceTicketEditModal
          open={Boolean(editingTicket)}
          ticket={editingTicket}
          onClose={() => setEditingTicket(null)}
          onSave={async (updates) => {
            await updateService(editingTicket.id, updates);
            setEditingTicket(null);
            showToast("Tiket servis berhasil diperbarui.", "success");
          }}
        />
      )}

      {/* MODAL MANIFEST PENGIRIMAN MITRA */}
      {manifestTicket && manifestPartner && (
        <ServiceManifestModal
          ticket={manifestTicket}
          partner={manifestPartner}
          onClose={() => setManifestTicket(null)}
        />
      )}

      {/* MODAL FORM TIKET LENGKAP */}
      <ServiceFormModal
        open={serviceModalOpen}
        partners={partners}
        onClose={() => setServiceModalOpen(false)}
        onSave={async (input: ServiceTicketInput) => {
          const created = await addService(input);
          setIntakeReceipt({ ticket: created, variant: "created" });
          showToast(`Tiket servis ${created.ticketNo} berhasil dibuat!`, "success");
        }}
      />

      {/* MODAL KELOLA MITRA */}
      <PartnerFormModal
        open={partnerModalOpen}
        partner={editingPartner}
        onClose={() => {
          setPartnerModalOpen(false);
          setEditingPartner(null);
        }}
        onSave={async (input: PartnerInput) => {
          if (editingPartner) {
            await updatePartner(editingPartner.id, input);
            showToast("Mitra servis berhasil diperbarui.", "success");
          } else {
            await addPartner(input);
            showToast("Mitra servis baru ditambahkan.", "success");
          }
        }}
      />

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleServiceBarcodeScanned}
        title="Scan Barcode / QR Tiket Servis"
        description="Arahkan kamera ke nomor tiket nota servis atau serial number perangkat"
        placeholderManual="Ketik nomor tiket servis (misal: SVC-20261105-001)..."
      />
    </div>
  );
}
