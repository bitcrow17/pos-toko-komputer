import type { Customer } from "@/types/customer";
import type { Partner, ServiceTicket } from "@/types/service";
import type { Product } from "@/types/product";
import type { Transaction, TransactionItem } from "@/types/transaction";
import type { Debt, DebtPaymentLog } from "@/types/debt";
import type {
  DbCustomer,
  DbDebt,
  DbPartner,
  DbProduct,
  DbService,
  DbTransaction,
  DbTransactionItem,
} from "@/types/supabase";

function customerCodeFromId(id: string): string {
  if (id.startsWith("CUS-")) {
    return `PLG-${id.slice(4)}`;
  }
  return id;
}

export function mapDbCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    code: customerCodeFromId(row.id),
    name: row.name,
    phone: row.phone,
    address: row.address ?? undefined,
    type: "REGULAR",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function mapCustomerToDb(
  customer: Pick<Customer, "id" | "name" | "phone" | "address" | "createdAt">,
): DbCustomer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address ?? null,
    created_at: customer.createdAt,
  };
}

export function mapDbProduct(row: DbProduct): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stock: Number(row.stock),
    serialNumber: row.serial_number ?? undefined,
    barcode: row.barcode ?? undefined,
    minimumStock: row.minimum_stock ?? undefined,
  };
}

export function mapProductToDb(
  product: Omit<Product, "id"> & { id?: string },
): Omit<DbProduct, "created_at"> {
  return {
    id: product.id ?? "",
    name: product.name,
    category: product.category,
    purchase_price: product.purchasePrice,
    selling_price: product.sellingPrice,
    stock: product.stock,
    serial_number: product.serialNumber ?? null,
    barcode: product.barcode ?? null,
    minimum_stock: product.minimumStock ?? null,
  };
}

export function mapDbTransactionItem(row: DbTransactionItem): TransactionItem {
  return {
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
  };
}

export function mapDbTransaction(
  row: DbTransaction,
  items: TransactionItem[] = [],
): Transaction {
  return {
    id: row.id,
    timestamp: row.timestamp,
    type: row.type ?? undefined,
    items,
    totalHarga: Number(row.total_harga),
    nominalBayar: Number(row.nominal_bayar),
    kembalian: Number(row.kembalian),
    paymentMethod: row.payment_method ?? undefined,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    debtId: row.debt_id ?? undefined,
    serviceTicketId: row.service_ticket_id ?? undefined,
    serviceTicketNo: row.service_ticket_no ?? undefined,
    servicePartnerFee: row.service_partner_fee ?? undefined,
    serviceSparepartCost: row.service_sparepart_cost ?? undefined,
    serviceNetProfit: row.service_net_profit ?? undefined,
  };
}

export function mapTransactionToDb(
  tx: Transaction,
): Omit<DbTransaction, "id"> & { id: string } {
  return {
    id: tx.id,
    timestamp: tx.timestamp,
    type: tx.type ?? "RETAIL",
    total_harga: tx.totalHarga,
    nominal_bayar: tx.nominalBayar,
    kembalian: tx.kembalian,
    payment_method: tx.paymentMethod ?? "CASH",
    customer_id: tx.customerId ?? null,
    customer_name: tx.customerName ?? null,
    customer_phone: tx.customerPhone ?? null,
    debt_id: tx.debtId ?? null,
    service_ticket_id: tx.serviceTicketId ?? null,
    service_ticket_no: tx.serviceTicketNo ?? null,
    service_partner_fee: tx.servicePartnerFee ?? null,
    service_sparepart_cost: tx.serviceSparepartCost ?? null,
    service_net_profit: tx.serviceNetProfit ?? null,
  };
}

export function mapTransactionItemToDb(
  transactionId: string,
  item: TransactionItem,
): Omit<DbTransactionItem, "id"> {
  return {
    transaction_id: transactionId,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  };
}

export function mapDbDebt(row: DbDebt): Debt {
  const history = Array.isArray(row.payment_history)
    ? (row.payment_history as DebtPaymentLog[])
    : [];

  return {
    id: row.id,
    transactionId: row.transaction_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount),
    remainingAmount: Number(row.remaining_amount),
    dueDate: row.due_date,
    status: row.status,
    paymentHistory: history,
    createdAt: row.created_at,
  };
}

export function mapDebtToDb(debt: Debt): DbDebt {
  return {
    id: debt.id,
    transaction_id: debt.transactionId,
    customer_id: debt.customerId,
    customer_name: debt.customerName,
    customer_phone: debt.customerPhone,
    total_amount: debt.totalAmount,
    paid_amount: debt.paidAmount,
    remaining_amount: debt.remainingAmount,
    due_date: debt.dueDate,
    status: debt.status,
    payment_history: debt.paymentHistory,
    created_at: debt.createdAt,
  };
}

export function mapDbPartner(row: DbPartner): Partner {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at ?? undefined,
  };
}

export function mapPartnerToDb(partner: Partner): DbPartner {
  return {
    id: partner.id,
    name: partner.name,
    phone: partner.phone,
    address: partner.address,
    created_at: partner.createdAt,
  };
}

export function mapDbService(row: DbService): ServiceTicket {
  return {
    id: row.id,
    ticketNo: row.ticket_no,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    deviceName: row.device_name,
    serialNumber: row.serial_number ?? undefined,
    problem: row.problem,
    handlingType: row.handling_type,
    partnerId: row.partner_id ?? undefined,
    partnerStatus: row.partner_status ?? undefined,
    partnerFee: Number(row.partner_fee),
    customerFee: Number(row.customer_fee),
    isComplaint: row.is_complaint,
    originalTicketNo: row.original_ticket_no ?? undefined,
    accessories: row.accessories ?? undefined,
    estimatedCompletionDate: row.estimated_completion_date ?? undefined,
    sparepartCost: row.sparepart_cost ?? undefined,
    netProfit: row.net_profit ?? undefined,
    isPaid: row.is_paid ?? undefined,
    paymentTransactionId: row.payment_transaction_id ?? undefined,
    collectedAt: row.collected_at ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapServiceToDb(ticket: ServiceTicket): DbService {
  return {
    id: ticket.id,
    ticket_no: ticket.ticketNo,
    customer_name: ticket.customerName,
    customer_phone: ticket.customerPhone,
    device_name: ticket.deviceName,
    serial_number: ticket.serialNumber ?? null,
    problem: ticket.problem,
    handling_type: ticket.handlingType,
    partner_id: ticket.partnerId ?? null,
    partner_status: ticket.partnerStatus ?? null,
    partner_fee: ticket.partnerFee,
    customer_fee: ticket.customerFee,
    is_complaint: ticket.isComplaint,
    original_ticket_no: ticket.originalTicketNo ?? null,
    accessories: ticket.accessories ?? ["UNIT"],
    estimated_completion_date: ticket.estimatedCompletionDate ?? null,
    sparepart_cost: ticket.sparepartCost ?? 0,
    net_profit: ticket.netProfit ?? null,
    is_paid: ticket.isPaid ?? false,
    payment_transaction_id: ticket.paymentTransactionId ?? null,
    collected_at: ticket.collectedAt ?? null,
    status: ticket.status,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
  };
}
