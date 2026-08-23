"use client";

import { useMemo, useState } from "react";
import {
  getComplaintWarning,
  getServiceKasirStatus,
  SERVICE_ACCESSORY_LABEL,
  SERVICE_KASIR_STATUS_BADGE,
  SERVICE_KASIR_STATUS_LABEL,
  type ServiceKasirStatus,
} from "@/lib/service";
import {
  INPUT_CLASS,
  TAB_GROUP_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";
import ServiceIntakeReceiptModal from "@/src/components/ServiceIntakeReceiptModal";
import ServicePickupReceiptModal from "@/src/components/ServicePickupReceiptModal";
import ComplaintBadge from "@/src/components/ui/ComplaintBadge";
import type {
  ServiceAccessory,
  ServiceTicket,
  ServiceTicketInput,
} from "@/types/service";
import type { PaymentMethod, Transaction } from "@/types/transaction";

type ServiceSubTab = "intake" | "status" | "checkout";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function ComplaintWarningBanner({ ticket }: { ticket: ServiceTicket }) {
  const warning = getComplaintWarning(ticket);
  if (!warning) return null;
  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
      <p className="font-semibold text-red-100">Peringatan Anti Double-Payment</p>
      <p className="mt-0.5">{warning}</p>
    </div>
  );
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

const ACCESSORY_OPTIONS: ServiceAccessory[] = ["UNIT", "CHARGER", "BOX"];

export default function KasirServicePanel() {
  const {
    services,
    partners,
    addService,
    collectServicePayment,
  } = useApp();

  const [subTab, setSubTab] = useState<ServiceSubTab>("intake");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceKasirStatus | "ALL">(
    "ALL",
  );

  // Intake form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [problem, setProblem] = useState("");
  const [handlingType, setHandlingType] = useState<"INTERNAL" | "PARTNER">(
    "INTERNAL",
  );
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [customerFeeInput, setCustomerFeeInput] = useState("");
  const [isComplaint, setIsComplaint] = useState(false);
  const [originalTicketNo, setOriginalTicketNo] = useState("");
  const [accessories, setAccessories] = useState<ServiceAccessory[]>(["UNIT"]);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState("");
  const [intakeMessage, setIntakeMessage] = useState<string | null>(null);

  // Checkout payment modal
  const [payTicket, setPayTicket] = useState<ServiceTicket | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [cashPaidInput, setCashPaidInput] = useState("");
  const [payError, setPayError] = useState<string | null>(null);

  const [pickupReceipt, setPickupReceipt] = useState<{
    transaction: Transaction;
    ticket: ServiceTicket;
  } | null>(null);

  const [intakeReceipt, setIntakeReceipt] = useState<{
    ticket: ServiceTicket;
    variant: "created" | "reprint";
  } | null>(null);

  const partnerById = useMemo(() => {
    const map = new Map(partners.map((p) => [p.id, p]));
    return map;
  }, [partners]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services
      .filter((ticket) => {
        const kasirStatus = getServiceKasirStatus(ticket);
        if (statusFilter !== "ALL" && kasirStatus !== statusFilter) return false;
        if (!q) return true;
        return (
          ticket.ticketNo.toLowerCase().includes(q) ||
          ticket.customerName.toLowerCase().includes(q) ||
          ticket.customerPhone.toLowerCase().includes(q) ||
          ticket.deviceName.toLowerCase().includes(q) ||
          (ticket.originalTicketNo?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [services, searchQuery, statusFilter]);

  const readyForPickup = useMemo(
    () =>
      services
        .filter((t) => getServiceKasirStatus(t) === "READY_PICKUP")
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [services],
  );

  function resetIntakeForm() {
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
  }

  function toggleAccessory(item: ServiceAccessory) {
    if (item === "UNIT") return;
    setAccessories((prev) =>
      prev.includes(item)
        ? prev.filter((a) => a !== item)
        : [...prev, item],
    );
  }

  function handleIntakeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIntakeMessage(null);

    const input: ServiceTicketInput = {
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
    };

    try {
      const created = addService(input);
      resetIntakeForm();
      setIntakeReceipt({ ticket: created, variant: "created" });
    } catch (err) {
      setIntakeMessage(
        err instanceof Error ? err.message : "Gagal mencatat servis.",
      );
    }
  }

  function openPayModal(ticket: ServiceTicket) {
    setPayTicket(ticket);
    setPayMethod("CASH");
    setCashPaidInput(
      ticket.isComplaint || ticket.customerFee === 0
        ? "0"
        : String(ticket.customerFee),
    );
    setPayError(null);
  }

  function handleCollectPayment() {
    if (!payTicket) return;
    setPayError(null);

    try {
      const amountDue = payTicket.isComplaint ? 0 : payTicket.customerFee;
      const cashPaid = parseRupiahInput(cashPaidInput);
      const tx = collectServicePayment(payTicket.id, {
        paymentMethod: payMethod,
        nominalBayar: payMethod === "CASH" ? cashPaid : amountDue,
      });
      const updated =
        services.find((s) => s.id === payTicket.id) ?? payTicket;
      setPickupReceipt({
        transaction: tx,
        ticket: {
          ...updated,
          isPaid: true,
          customerFee: amountDue,
          paymentTransactionId: tx.id,
        },
      });
      setPayTicket(null);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Gagal memproses pelunasan.",
      );
    }
  }

  const amountDue = payTicket
    ? payTicket.isComplaint
      ? 0
      : payTicket.customerFee
    : 0;
  const cashPaid = parseRupiahInput(cashPaidInput);
  const changeAmount = Math.max(0, cashPaid - amountDue);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className={TAB_GROUP_CLASS} role="tablist" aria-label="Sub-menu servis kasir">
          {(
            [
              { id: "intake", label: "Input Servis Masuk" },
              { id: "status", label: "Daftar & Cek Status" },
              { id: "checkout", label: "Pelunasan Servis Keluar" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={tabButtonClass(subTab === tab.id, "violet")}
            >
              {tab.label}
              {tab.id === "checkout" && readyForPickup.length > 0 && (
                <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                  {readyForPickup.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {subTab === "intake" && (
          <form
            onSubmit={handleIntakeSubmit}
            className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
          >
            <div>
              <h2 className="text-lg font-semibold text-white">
                Input Servis Masuk
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Catat unit pelanggan yang masuk untuk diperbaiki.
              </p>
            </div>

            {intakeMessage && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  intakeMessage.startsWith("Tiket")
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {intakeMessage}
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
                  Centang jika unit sudah pernah diservis — biaya pelanggan
                  otomatis Rp 0 (anti double-payment).
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

            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>

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
              Keluhan
              <textarea
                required
                rows={3}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className={`${INPUT_CLASS} mt-1.5 resize-none`}
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm text-slate-400">
                Kelengkapan Unit Diterima
              </legend>
              <div className="flex flex-wrap gap-3">
                {ACCESSORY_OPTIONS.map((item) => {
                  const checked = accessories.includes(item);
                  const locked = item === "UNIT";
                  return (
                    <label
                      key={item}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        checked
                          ? "border-violet-500/50 bg-violet-500/10 text-violet-100"
                          : "border-slate-700 text-slate-400"
                      } ${locked ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleAccessory(item)}
                        className="rounded border-slate-600 bg-slate-950 text-violet-500"
                      />
                      {SERVICE_ACCESSORY_LABEL[item]}
                      {locked && (
                        <span className="text-[10px] text-slate-500">wajib</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm text-slate-400">Penanganan</legend>
              <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setHandlingType("INTERNAL")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    handlingType === "INTERNAL"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  Internal
                </button>
                <button
                  type="button"
                  onClick={() => setHandlingType("PARTNER")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    handlingType === "PARTNER"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400"
                  }`}
                >
                  Kirim ke Mitra
                </button>
              </div>
              {handlingType === "PARTNER" && (
                <select
                  required
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>

            {!isComplaint && (
              <label className="block text-sm text-slate-400">
                Estimasi Biaya Pelanggan (boleh diisi nanti)
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

            <button
              type="submit"
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Simpan Tiket Servis
            </button>
          </form>
        )}

        {subTab === "status" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block max-w-md flex-1 text-sm text-slate-400">
                Cari tiket / pelanggan / perangkat
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT_CLASS} mt-1.5`}
                  placeholder="No. tiket, nama, HP…"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as ServiceKasirStatus | "ALL",
                  )
                }
                className={INPUT_CLASS}
                aria-label="Filter status"
              >
                <option value="ALL">Semua Status</option>
                {(
                  Object.keys(SERVICE_KASIR_STATUS_LABEL) as ServiceKasirStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_KASIR_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tiket</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Perangkat</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Biaya</th>
                    <th className="px-4 py-3 text-right">Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Tidak ada tiket yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((ticket) => {
                      const kasirStatus = getServiceKasirStatus(ticket);
                      const partner =
                        ticket.partnerId &&
                        partnerById.get(ticket.partnerId);
                      return (
                        <tr key={ticket.id} className="hover:bg-slate-900/40">
                          <td className="px-4 py-3">
                            <p className="font-mono text-cyan-300">
                              {ticket.ticketNo}
                            </p>
                            {ticket.isComplaint && (
                              <div className="mt-1">
                                <ComplaintBadge />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-200">
                              {ticket.customerName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {ticket.customerPhone}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-200">
                              {ticket.deviceName}
                            </p>
                            {partner && (
                              <p className="text-xs text-slate-500">
                                Mitra: {partner.name}
                              </p>
                            )}
                            {ticket.isComplaint && (
                              <p className="mt-1 text-xs text-red-300">
                                Garansi dari #{ticket.originalTicketNo}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${SERVICE_KASIR_STATUS_BADGE[kasirStatus]}`}
                            >
                              {SERVICE_KASIR_STATUS_LABEL[kasirStatus]}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-300">
                            {ticket.isComplaint
                              ? "Rp 0 (garansi)"
                              : formatRupiah(ticket.customerFee)}
                          </td>
                          <td className="px-4 py-3 text-right">
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
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-200"
                            >
                              <PrinterIcon className="h-3.5 w-3.5" />
                              Cetak Ulang
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subTab === "checkout" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Pelunasan Servis Keluar
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Unit berstatus Selesai / Siap Diambil — bayar & serahkan ke
                pelanggan. Uang masuk tercatat sebagai kas{" "}
                <strong className="text-violet-300">SERVICE</strong>.
              </p>
            </div>

            {readyForPickup.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-12 text-center text-slate-500">
                Belum ada unit siap diambil.
              </div>
            ) : (
              <ul className="space-y-3">
                {readyForPickup.map((ticket) => (
                  <li
                    key={ticket.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-cyan-300">
                            {ticket.ticketNo}
                          </span>
                          {ticket.isComplaint && <ComplaintBadge />}
                        </div>
                        <p className="text-slate-200">
                          {ticket.customerName} · {ticket.customerPhone}
                        </p>
                        <p className="text-sm text-slate-400">
                          {ticket.deviceName}
                          {ticket.serialNumber
                            ? ` · ${ticket.serialNumber}`
                            : ""}
                        </p>
                        <p className="text-sm font-medium text-white">
                          Tagihan:{" "}
                          {ticket.isComplaint
                            ? "Rp 0 (komplain/garansi)"
                            : formatRupiah(ticket.customerFee)}
                        </p>
                        <ComplaintWarningBanner ticket={ticket} />
                      </div>
                      <button
                        type="button"
                        onClick={() => openPayModal(ticket)}
                        className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                      >
                        Bayar & Ambil Unit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {payTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-pay-title"
        >
          <button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setPayTicket(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2
                id="service-pay-title"
                className="text-lg font-semibold text-white"
              >
                Pembayaran Servis
              </h2>
              <p className="text-sm text-slate-400">{payTicket.ticketNo}</p>
            </div>

            <div className="space-y-4 px-5 py-4">
              {payTicket.isComplaint && (
                <>
                  <ComplaintBadge />
                  <ComplaintWarningBanner ticket={payTicket} />
                </>
              )}

              {payError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {payError}
                </p>
              )}

              <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                <p className="text-xs text-slate-500">Total tagihan</p>
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {formatRupiah(amountDue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Kas masuk kategori SERVICE
                </p>
              </div>

              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Metode Bayar
                </legend>
                <div className="inline-flex rounded-lg border border-slate-700 p-1">
                  {(["CASH", "QRIS", "TRANSFER"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        payMethod === m
                          ? "bg-cyan-600 text-white"
                          : "text-slate-400"
                      }`}
                    >
                      {m === "CASH" ? "Tunai" : m === "QRIS" ? "QRIS" : "Transfer"}
                    </button>
                  ))}
                </div>
              </fieldset>

              {payMethod === "CASH" && amountDue > 0 && (
                <>
                  <label className="block text-sm text-slate-400">
                    Uang Diterima
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashPaidInput}
                      onChange={(e) => setCashPaidInput(e.target.value)}
                      className={`${INPUT_CLASS} mt-1.5`}
                    />
                  </label>
                  <p className="text-sm text-slate-400">
                    Kembalian:{" "}
                    <span className="font-semibold text-emerald-300">
                      {formatRupiah(changeAmount)}
                    </span>
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setPayTicket(null)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCollectPayment}
                disabled={
                  payMethod === "CASH" &&
                  amountDue > 0 &&
                  cashPaid < amountDue
                }
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {amountDue === 0 ? "Serahkan Unit" : "Bayar & Cetak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pickupReceipt && (
        <ServicePickupReceiptModal
          transaction={pickupReceipt.transaction}
          ticket={pickupReceipt.ticket}
          onClose={() => setPickupReceipt(null)}
        />
      )}

      {intakeReceipt && (
        <ServiceIntakeReceiptModal
          ticket={intakeReceipt.ticket}
          variant={intakeReceipt.variant}
          onClose={() => {
            setIntakeReceipt(null);
            if (intakeReceipt.variant === "created") {
              setSubTab("status");
            }
          }}
        />
      )}
    </div>
  );
}
