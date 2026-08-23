"use client";

import { useMemo, useState } from "react";
import {
  HANDLING_TYPE_LABEL,
  getComplaintWarning,
  PARTNER_STATUS_BADGE,
  PARTNER_STATUS_LABEL,
  SERVICE_STATUS_BADGE,
  SERVICE_STATUS_LABEL,
} from "@/lib/service";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_CLASS,
  PAGE_WRAPPER,
  STAT_CARD,
  TABLE_BODY_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_WRAPPER_CLASS,
  TAB_GROUP_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import ComplaintBadge from "@/src/components/ui/ComplaintBadge";
import PageHeader from "@/src/components/ui/PageHeader";
import PartnerFormModal from "@/src/components/PartnerFormModal";
import ServiceFormModal from "@/src/components/ServiceFormModal";
import ServiceIntakeReceiptModal from "@/src/components/ServiceIntakeReceiptModal";
import ServiceManifestModal from "@/src/components/ServiceManifestModal";
import { useApp } from "@/src/context/AppContext";
import type { Partner, ServiceStatus, ServiceTicket } from "@/types/service";

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

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

const INPUT_CLASS_LOCAL = INPUT_CLASS;

export default function AdminServicesPage() {
  const {
    services,
    partners,
    addService,
    updateService,
    deleteService,
    addPartner,
    updatePartner,
    deletePartner,
    sendServiceToPartner,
    confirmServiceReturned,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [handlingFilter, setHandlingFilter] = useState<"ALL" | "INTERNAL" | "PARTNER">(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "ALL">("ALL");

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [manifestTicket, setManifestTicket] = useState<ServiceTicket | null>(null);
  const [intakeReceipt, setIntakeReceipt] = useState<{
    ticket: ServiceTicket;
    variant: "created" | "reprint";
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

  const stats = useMemo(
    () => ({
      total: services.length,
      internal: services.filter((s) => s.handlingType === "INTERNAL").length,
      partner: services.filter((s) => s.handlingType === "PARTNER").length,
      active: services.filter(
        (s) => s.status !== "COMPLETED" && s.status !== "CANCELLED",
      ).length,
    }),
    [services],
  );

  function openCreatePartner() {
    setEditingPartner(null);
    setPartnerModalOpen(true);
  }

  function openEditPartner(partner: Partner) {
    setEditingPartner(partner);
    setPartnerModalOpen(true);
  }

  function handleSavePartner(input: Parameters<typeof addPartner>[0]) {
    if (editingPartner) {
      updatePartner(editingPartner.id, input);
    } else {
      addPartner(input);
    }
  }

  function handleDeletePartner(partner: Partner) {
    const ok = window.confirm(`Hapus mitra "${partner.name}"?`);
    if (!ok) return;
    try {
      deletePartner(partner.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal menghapus mitra.");
    }
  }

  function handleSaveService(input: Parameters<typeof addService>[0]) {
    try {
      const created = addService(input);
      setIntakeReceipt({ ticket: created, variant: "created" });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal menyimpan servis.");
      throw error;
    }
  }

  function handleSendToPartner(ticket: ServiceTicket) {
    try {
      sendServiceToPartner(ticket.id);
      const partner = ticket.partnerId
        ? partnerById.get(ticket.partnerId)
        : undefined;
      if (partner) {
        const updated = services.find((s) => s.id === ticket.id);
        setManifestTicket(
          updated
            ? { ...updated, partnerStatus: "IN_TRANSIT", status: "PROCESSING" }
            : { ...ticket, partnerStatus: "IN_TRANSIT", status: "PROCESSING" },
        );
      }
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal mengirim ke mitra.",
      );
    }
  }

  function handleConfirmReturn(ticket: ServiceTicket) {
    const ok = window.confirm(
      `Konfirmasi unit ${ticket.ticketNo} sudah kembali ke toko?`,
    );
    if (!ok) return;
    try {
      confirmServiceReturned(ticket.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Gagal konfirmasi pengembalian.",
      );
    }
  }

  function handleStatusChange(ticket: ServiceTicket, status: ServiceStatus) {
    updateService(ticket.id, { status });
  }

  function handleDeleteService(ticket: ServiceTicket) {
    const ok = window.confirm(`Hapus tiket servis ${ticket.ticketNo}?`);
    if (!ok) return;
    deleteService(ticket.id);
  }

  function openManifest(ticket: ServiceTicket) {
    if (!ticket.partnerId) return;
    const partner = partnerById.get(ticket.partnerId);
    if (!partner) {
      window.alert("Data mitra tidak ditemukan.");
      return;
    }
    setManifestTicket(ticket);
  }

  const manifestPartner =
    manifestTicket?.partnerId && partnerById.get(manifestTicket.partnerId);

  return (
    <>
      <div className={PAGE_WRAPPER}>
        <PageHeader
          title="Manajemen Servis"
          subtitle="Servis internal toko dan penanganan via mitra rekan dengan surat jalan."
          actions={
            <>
              <button
                type="button"
                onClick={openCreatePartner}
                className={BTN_SECONDARY}
              >
                + Mitra Rekan
              </button>
              <button
                type="button"
                onClick={() => setServiceModalOpen(true)}
                className={BTN_PRIMARY}
              >
                + Input Servis Baru
              </button>
            </>
          }
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Tiket", value: stats.total },
            { label: "Aktif", value: stats.active },
            { label: "Internal", value: stats.internal },
            { label: "Via Mitra", value: stats.partner },
          ].map((item) => (
            <div key={item.label} className={STAT_CARD}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {partners.length > 0 && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Mitra Rekan Terdaftar
            </h2>
            <div className="flex flex-wrap gap-2">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{partner.name}</p>
                    <p className="text-xs text-slate-500">{partner.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditPartner(partner)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePartner(partner)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Portal mitra:{" "}
              <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-indigo-700">
                /partner/services?partnerId=PTR-001
              </code>
            </p>
          </section>
        )}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block max-w-md flex-1 text-sm font-medium text-slate-600">
            Cari Tiket / Pelanggan / Perangkat
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="No. tiket, nama, HP, perangkat…"
              className={`${INPUT_CLASS_LOCAL} mt-1.5`}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <div className={TAB_GROUP_CLASS} role="group" aria-label="Filter penanganan">
              {(
                [
                  { value: "ALL", label: "Semua" },
                  { value: "INTERNAL", label: "Internal" },
                  { value: "PARTNER", label: "Mitra" },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setHandlingFilter(item.value)}
                  aria-pressed={handlingFilter === item.value}
                  className={tabButtonClass(handlingFilter === item.value, "indigo")}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ServiceStatus | "ALL")
              }
              className={INPUT_CLASS_LOCAL}
              aria-label="Filter status pengerjaan"
            >
              <option value="ALL">Semua Status</option>
              {(Object.keys(SERVICE_STATUS_LABEL) as ServiceStatus[]).map(
                (status) => (
                  <option key={status} value={status}>
                    {SERVICE_STATUS_LABEL[status]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className={TABLE_WRAPPER_CLASS}>
          <table className={TABLE_CLASS}>
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tiket</th>
                <th className="px-4 py-3 text-left font-semibold">Pelanggan</th>
                <th className="px-4 py-3 text-left font-semibold">Perangkat</th>
                <th className="px-4 py-3 text-left font-semibold">Penanganan</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Biaya</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className={TABLE_BODY_CLASS}>
              {filteredServices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Belum ada tiket servis.
                  </td>
                </tr>
              ) : (
                filteredServices.map((ticket) => {
                  const partner =
                    ticket.partnerId && partnerById.get(ticket.partnerId);
                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-indigo-700">
                          {ticket.ticketNo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTimestamp(ticket.createdAt)}
                        </p>
                        {ticket.isComplaint && (
                          <div className="mt-1.5">
                            <ComplaintBadge />
                          </div>
                        )}
                        {ticket.isPaid && (
                          <p className="mt-1 text-[11px] text-teal-400">
                            Sudah diambil
                          </p>
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
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {ticket.problem}
                        </p>
                        {ticket.isComplaint && getComplaintWarning(ticket) && (
                          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
                            {getComplaintWarning(ticket)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300">
                          {HANDLING_TYPE_LABEL[ticket.handlingType]}
                        </span>
                        {partner && (
                          <p className="mt-1 text-xs text-slate-500">
                            {partner.name}
                          </p>
                        )}
                        {ticket.partnerStatus && (
                          <span
                            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${PARTNER_STATUS_BADGE[ticket.partnerStatus]}`}
                          >
                            {PARTNER_STATUS_LABEL[ticket.partnerStatus]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${SERVICE_STATUS_BADGE[ticket.status]}`}
                        >
                          {SERVICE_STATUS_LABEL[ticket.status]}
                        </span>
                        {ticket.handlingType === "INTERNAL" && (
                          <select
                            value={ticket.status}
                            onChange={(e) =>
                              handleStatusChange(
                                ticket,
                                e.target.value as ServiceStatus,
                              )
                            }
                            className="mt-2 block w-full max-w-[140px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                            aria-label={`Ubah status ${ticket.ticketNo}`}
                          >
                            {(Object.keys(SERVICE_STATUS_LABEL) as ServiceStatus[]).map(
                              (status) => (
                                <option key={status} value={status}>
                                  {SERVICE_STATUS_LABEL[status]}
                                </option>
                              ),
                            )}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <p className="text-xs text-slate-500">Pelanggan</p>
                        <p>{formatRupiah(ticket.customerFee)}</p>
                        {ticket.handlingType === "PARTNER" && (
                          <>
                            <p className="mt-1 text-xs text-slate-500">Mitra</p>
                            <p>{formatRupiah(ticket.partnerFee)}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          {ticket.handlingType === "PARTNER" &&
                            ticket.partnerStatus === "PENDING_SEND" && (
                              <button
                                type="button"
                                onClick={() => handleSendToPartner(ticket)}
                                className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500"
                              >
                                Kirim ke Mitra
                              </button>
                            )}
                          {ticket.handlingType === "PARTNER" &&
                            ticket.partnerStatus &&
                            ticket.partnerStatus !== "PENDING_SEND" && (
                              <button
                                type="button"
                                onClick={() => openManifest(ticket)}
                                className="rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                              >
                                Cetak Surat Jalan
                              </button>
                            )}
                          {ticket.partnerStatus === "RETURN_IN_TRANSIT" && (
                            <button
                              type="button"
                              onClick={() => handleConfirmReturn(ticket)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                            >
                              Konfirmasi Kembali
                            </button>
                          )}
                          <button
                            type="button"
                            title="Cetak ulang tanda terima"
                            aria-label={`Cetak ulang tanda terima ${ticket.ticketNo}`}
                            onClick={() =>
                              setIntakeReceipt({
                                ticket,
                                variant: "reprint",
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800"
                          >
                            <PrinterIcon className="h-3.5 w-3.5" />
                            Tanda Terima
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(ticket)}
                            className="rounded-lg px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/30"
                          >
                            Hapus
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
      </div>

      <ServiceFormModal
        open={serviceModalOpen}
        partners={partners}
        onClose={() => setServiceModalOpen(false)}
        onSave={handleSaveService}
      />

      <PartnerFormModal
        open={partnerModalOpen}
        partner={editingPartner}
        onClose={() => setPartnerModalOpen(false)}
        onSave={handleSavePartner}
      />

      {manifestTicket && manifestPartner && (
        <ServiceManifestModal
          ticket={manifestTicket}
          partner={manifestPartner}
          onClose={() => setManifestTicket(null)}
        />
      )}

      {intakeReceipt && (
        <ServiceIntakeReceiptModal
          ticket={intakeReceipt.ticket}
          variant={intakeReceipt.variant}
          onClose={() => setIntakeReceipt(null)}
        />
      )}
    </>
  );
}
