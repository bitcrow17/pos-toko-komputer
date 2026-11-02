import { STORE_INFO } from "@/lib/store-config";

export function toWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
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
