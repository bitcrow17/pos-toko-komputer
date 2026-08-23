export interface Partner {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export type PartnerInput = Omit<Partner, "id">;

export type HandlingType = "INTERNAL" | "PARTNER";

export type PartnerStatus =
  | "PENDING_SEND"
  | "IN_TRANSIT"
  | "RECEIVED_BY_PARTNER"
  | "REPAIRED"
  | "RETURN_IN_TRANSIT"
  | "RETURNED_TO_STORE";

export type ServiceStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

/** Kelengkapan unit yang diterima saat intake */
export type ServiceAccessory = "UNIT" | "CHARGER" | "BOX";

export interface ServiceTicket {
  id: string;
  ticketNo: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  serialNumber?: string;
  problem: string;
  handlingType: HandlingType;
  partnerId?: string;
  partnerStatus?: PartnerStatus;
  partnerFee: number;
  customerFee: number;
  /** Unit komplain / garansi ulang — jangan klaim ongkos ganda */
  isComplaint: boolean;
  /** Nomor tiket / nota servis sebelumnya (jika komplain) */
  originalTicketNo?: string;
  /** Kelengkapan diterima (minimal UNIT) */
  accessories?: ServiceAccessory[];
  /** Estimasi tanggal selesai (YYYY-MM-DD atau ISO) */
  estimatedCompletionDate?: string;
  /** Biaya komponen dari toko (jika ada) */
  sparepartCost?: number;
  /** Margin murni: customerFee - partnerFee - sparepartCost */
  netProfit?: number;
  /** Sudah dilunasi & unit diambil di kasir */
  isPaid?: boolean;
  /** ID transaksi kas tipe SERVICE saat pelunasan */
  paymentTransactionId?: string;
  collectedAt?: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export type ServiceTicketInput = Omit<
  ServiceTicket,
  | "id"
  | "ticketNo"
  | "createdAt"
  | "updatedAt"
  | "netProfit"
  | "isPaid"
  | "paymentTransactionId"
  | "collectedAt"
>;
