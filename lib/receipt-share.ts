import { STORE_INFO } from "@/lib/store-config";

export function toWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function openWhatsAppShare(text: string, phone?: string): void {
  if (typeof window === "undefined") return;
  const encoded = encodeURIComponent(text);
  const num = phone ? toWhatsAppPhone(phone) : "";
  const url = num
    ? `https://wa.me/${num}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function formatReceiptRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildRetailReceiptShareText(input: {
  invoiceId: string;
  customerName?: string;
  total: number;
  paid: number;
}): string {
  const lines = [
    `*${STORE_INFO.name}*`,
    "Nota Digital Penjualan",
    `No: ${input.invoiceId}`,
  ];
  if (input.customerName?.trim()) {
    lines.push(`Pelanggan: ${input.customerName.trim()}`);
  }
  lines.push(`Total: ${formatReceiptRupiah(input.total)}`);
  lines.push(`Dibayar: ${formatReceiptRupiah(input.paid)}`);
  lines.push("", "Terima kasih. Simpan nota ini sebagai bukti transaksi.");
  return lines.join("\n");
}

export function buildServiceReceiptShareText(input: {
  ticketNo: string;
  customerName: string;
  deviceName: string;
  total?: number;
  kind: "intake" | "pickup";
}): string {
  const title =
    input.kind === "intake"
      ? "Tanda Terima Servis (Nota Digital)"
      : "Struk Pengambilan Servis (Nota Digital)";
  const lines = [
    `*${STORE_INFO.name}*`,
    title,
    `Tiket: ${input.ticketNo}`,
    `Pelanggan: ${input.customerName}`,
    `Perangkat: ${input.deviceName}`,
  ];
  if (input.total != null) {
    lines.push(`Total: ${formatReceiptRupiah(input.total)}`);
  }
  lines.push("", "Unduh PDF dari aplikasi untuk arsip tanpa kertas.");
  return lines.join("\n");
}

export function buildServiceTicketWhatsAppMessage(input: {
  storeName?: string;
  ticketNo: string;
  customerName: string;
  deviceName: string;
  complaint?: string;
  status?: string;
  costEstimate?: number;
  totalCost?: number;
  kind: "intake" | "pickup";
  storePhone?: string;
  storeAddress?: string;
}): string {
  const store = input.storeName || STORE_INFO.name || "Retail Komputer";
  const title =
    input.kind === "intake"
      ? "TANDA TERIMA SERVIS MASUK"
      : "BUKTI PENGAMBILAN & PELUNASAN SERVIS";

  const lines: string[] = [
    `*${store.toUpperCase()}*`,
    `📋 *${title}*`,
    "───────────────────────────────",
    `• *No. Tiket*    : ${input.ticketNo}`,
    `• *Pelanggan*   : ${input.customerName}`,
    `• *Perangkat*   : ${input.deviceName}`,
  ];

  if (input.complaint?.trim()) {
    lines.push(`• *Keluhan/Diagnosa*: ${input.complaint.trim()}`);
  }

  if (input.status?.trim()) {
    lines.push(`• *Status*       : ${input.status.trim()}`);
  }

  if (input.kind === "intake" && input.costEstimate != null && input.costEstimate > 0) {
    lines.push(`• *Estimasi Biaya*: ${formatReceiptRupiah(input.costEstimate)}`);
  }

  if (input.kind === "pickup" && input.totalCost != null) {
    lines.push(`• *Total Biaya*  : ${formatReceiptRupiah(input.totalCost)}`);
  }

  lines.push("───────────────────────────────");
  if (input.kind === "intake") {
    lines.push(
      "💡 *Catatan Pengambilan:*",
      "Mohon simpan pesan WhatsApp ini atau bukti cetak/PDF sebagai tanda bukti sah saat mengambil unit servis.",
    );
  } else {
    lines.push(
      "✅ *Unit Berhasil Diambil:*",
      "Terima kasih atas kepercayaan Anda. Mohon simpan bukti ini untuk kemudahan klaim garansi servis.",
    );
  }

  if (input.storePhone || input.storeAddress) {
    lines.push("");
    if (input.storePhone) lines.push(`📞 Kontak/WA: ${input.storePhone}`);
    if (input.storeAddress) lines.push(`📍 Alamat: ${input.storeAddress}`);
  }

  return lines.join("\n");
}

export function buildDebtReceiptShareText(input: {
  invoiceId: string;
  customerName: string;
  paid: number;
  remaining: number;
}): string {
  return [
    `*${STORE_INFO.name}*`,
    "Bukti Bayar Utang (Nota Digital)",
    `No: ${input.invoiceId}`,
    `Pelanggan: ${input.customerName}`,
    `Dibayar: ${formatReceiptRupiah(input.paid)}`,
    `Sisa: ${formatReceiptRupiah(input.remaining)}`,
    "",
    "Simpan nota digital ini sebagai bukti pembayaran.",
  ].join("\n");
}
