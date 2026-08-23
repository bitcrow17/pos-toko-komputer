import type {
  Partner,
  PartnerInput,
  PartnerStatus,
  ServiceAccessory,
  ServiceStatus,
  ServiceTicket,
  ServiceTicketInput,
} from "@/types/service";

export function generatePartnerId(existing: Partner[]): string {
  const count = existing.length + 1;
  return `PTR-${String(count).padStart(3, "0")}`;
}

export function generateServiceId(existing: ServiceTicket[]): string {
  const count = existing.length + 1;
  return `SRV-${String(count).padStart(4, "0")}`;
}

export function generateTicketNo(existing: ServiceTicket[]): string {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  return `SVC-${year}-${String(seq).padStart(4, "0")}`;
}

export function validatePartnerInput(input: PartnerInput): string | null {
  if (!input.name?.trim()) return "Nama mitra wajib diisi.";
  if (!input.phone?.trim()) return "Nomor HP mitra wajib diisi.";
  if (!input.address?.trim()) return "Alamat mitra wajib diisi.";
  return null;
}

export function computeServiceNetProfit(
  customerFee: number,
  partnerFee: number,
  sparepartCost = 0,
): number {
  return customerFee - partnerFee - (sparepartCost || 0);
}

export function normalizeServiceAccessories(
  accessories?: ServiceAccessory[],
): ServiceAccessory[] {
  const set = new Set<ServiceAccessory>(accessories ?? ["UNIT"]);
  set.add("UNIT");
  const order: ServiceAccessory[] = ["UNIT", "CHARGER", "BOX"];
  return order.filter((item) => set.has(item));
}

export const SERVICE_ACCESSORY_LABEL: Record<ServiceAccessory, string> = {
  UNIT: "Unit",
  CHARGER: "Charger",
  BOX: "Dus / Box",
};

export function formatServiceAccessoriesLabel(
  accessories?: ServiceAccessory[],
): string {
  const items = normalizeServiceAccessories(accessories);
  if (items.length === 1) return "Unit saja";
  return items.map((item) => SERVICE_ACCESSORY_LABEL[item]).join(" + ");
}

export function validateServiceInput(input: ServiceTicketInput): string | null {
  if (!input.customerName?.trim()) return "Nama pelanggan wajib diisi.";
  if (!input.customerPhone?.trim()) return "Nomor HP pelanggan wajib diisi.";
  if (!input.deviceName?.trim()) return "Nama perangkat wajib diisi.";
  if (!input.problem?.trim()) return "Keluhan / masalah wajib diisi.";
  if (input.handlingType !== "INTERNAL" && input.handlingType !== "PARTNER") {
    return "Tipe penanganan tidak valid.";
  }
  if (input.handlingType === "PARTNER" && !input.partnerId?.trim()) {
    return "Pilih mitra rekan untuk penanganan eksternal.";
  }
  if (!Number.isFinite(input.partnerFee) || input.partnerFee < 0) {
    return "Biaya mitra harus angka ≥ 0.";
  }
  if (!Number.isFinite(input.customerFee) || input.customerFee < 0) {
    return "Biaya pelanggan harus angka ≥ 0.";
  }
  if (
    input.sparepartCost != null &&
    (!Number.isFinite(input.sparepartCost) || input.sparepartCost < 0)
  ) {
    return "Biaya sparepart harus angka ≥ 0.";
  }
  if (input.isComplaint && !input.originalTicketNo?.trim()) {
    return "Nomor tiket / nota servis sebelumnya wajib diisi untuk unit komplain.";
  }
  return null;
}

export function buildPartnerFromInput(
  existing: Partner[],
  input: PartnerInput,
): Partner {
  const error = validatePartnerInput(input);
  if (error) throw new Error(error);

  return {
    id: generatePartnerId(existing),
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
  };
}

export function buildServiceFromInput(
  existing: ServiceTicket[],
  input: ServiceTicketInput,
): ServiceTicket {
  const error = validateServiceInput(input);
  if (error) throw new Error(error);

  const now = new Date().toISOString();
  const isPartner = input.handlingType === "PARTNER";
  const isComplaint = Boolean(input.isComplaint);
  const sparepartCost = input.sparepartCost ?? 0;
  const customerFee = isComplaint ? 0 : input.customerFee;
  const partnerFee = input.partnerFee;
  const estimatedCompletionDate = input.estimatedCompletionDate?.trim() || undefined;

  return {
    id: generateServiceId(existing),
    ticketNo: generateTicketNo(existing),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    deviceName: input.deviceName.trim(),
    serialNumber: input.serialNumber?.trim() || undefined,
    problem: input.problem.trim(),
    handlingType: input.handlingType,
    partnerId: isPartner ? input.partnerId : undefined,
    partnerStatus: isPartner ? (input.partnerStatus ?? "PENDING_SEND") : undefined,
    partnerFee,
    customerFee,
    isComplaint,
    originalTicketNo: isComplaint
      ? input.originalTicketNo?.trim()
      : undefined,
    accessories: normalizeServiceAccessories(input.accessories),
    estimatedCompletionDate,
    sparepartCost,
    netProfit: computeServiceNetProfit(customerFee, partnerFee, sparepartCost),
    isPaid: false,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
}

/** Label status ringkas untuk layar Kasir */
export type ServiceKasirStatus =
  | "PENDING"
  | "AT_PARTNER"
  | "READY_PICKUP"
  | "COLLECTED"
  | "CANCELLED";

export function getServiceKasirStatus(
  ticket: ServiceTicket,
): ServiceKasirStatus {
  if (ticket.status === "CANCELLED") return "CANCELLED";
  if (ticket.isPaid) return "COLLECTED";

  const readyForPickup =
    ticket.status === "COMPLETED" ||
    ticket.partnerStatus === "RETURNED_TO_STORE";

  if (readyForPickup) return "READY_PICKUP";

  if (
    ticket.handlingType === "PARTNER" &&
    ticket.partnerStatus &&
    ticket.partnerStatus !== "PENDING_SEND" &&
    ticket.partnerStatus !== "RETURNED_TO_STORE"
  ) {
    return "AT_PARTNER";
  }

  return "PENDING";
}

export const SERVICE_KASIR_STATUS_LABEL: Record<ServiceKasirStatus, string> = {
  PENDING: "Pending / Antrian",
  AT_PARTNER: "Dikerjakan Mitra",
  READY_PICKUP: "Siap Diambil",
  COLLECTED: "Sudah Diambil",
  CANCELLED: "Batal",
};

export const SERVICE_KASIR_STATUS_BADGE: Record<ServiceKasirStatus, string> = {
  PENDING: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  AT_PARTNER: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  READY_PICKUP: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  COLLECTED: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
  CANCELLED: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
};

export function getComplaintWarning(ticket: ServiceTicket): string | null {
  if (!ticket.isComplaint) return null;
  const ref = ticket.originalTicketNo?.trim() || "—";
  return `Unit ini adalah garansi ulang dari Tiket #${ref}. Pastikan tidak ada klaim ongkos ganda!`;
}

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  QUEUED: "Antrian",
  PROCESSING: "Diproses",
  COMPLETED: "Selesai",
  CANCELLED: "Batal",
};

export const SERVICE_STATUS_BADGE: Record<ServiceStatus, string> = {
  QUEUED: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  PROCESSING: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  CANCELLED: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
};

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  PENDING_SEND: "Menunggu Kirim",
  IN_TRANSIT: "Dalam Pengiriman",
  RECEIVED_BY_PARTNER: "Diterima Mitra",
  REPAIRED: "Selesai Diperbaiki",
  RETURN_IN_TRANSIT: "Pengembalian",
  RETURNED_TO_STORE: "Kembali ke Toko",
};

export const PARTNER_STATUS_BADGE: Record<PartnerStatus, string> = {
  PENDING_SEND: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
  IN_TRANSIT: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  RECEIVED_BY_PARTNER: "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30",
  REPAIRED: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  RETURN_IN_TRANSIT: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
  RETURNED_TO_STORE: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
};

export const HANDLING_TYPE_LABEL: Record<
  ServiceTicket["handlingType"],
  string
> = {
  INTERNAL: "Internal",
  PARTNER: "Mitra Rekan",
};
