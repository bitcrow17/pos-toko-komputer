import type { Debt, DebtInput, DebtStatus } from "@/types/debt";

export function generateDebtId(existing: Debt[]): string {
  const count = existing.length + 1;
  return `DEBT-${String(count).padStart(4, "0")}`;
}

export function generatePaymentLogId(): string {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function computeDebtStatus(
  totalAmount: number,
  paidAmount: number,
): DebtStatus {
  if (paidAmount <= 0) return "UNPAID";
  if (paidAmount >= totalAmount) return "PAID";
  return "PARTIAL";
}

export function validateDebtInput(input: DebtInput): string | null {
  if (!input.transactionId?.trim()) {
    return "ID transaksi wajib diisi.";
  }
  if (!input.customerId?.trim()) {
    return "ID pelanggan wajib diisi.";
  }
  if (!input.customerName?.trim()) {
    return "Nama pelanggan wajib diisi.";
  }
  if (!input.customerPhone?.trim()) {
    return "No. HP pelanggan wajib diisi.";
  }
  if (!input.dueDate?.trim()) {
    return "Tanggal jatuh tempo wajib diisi.";
  }
  if (!input.createdAt?.trim()) {
    return "Tanggal pembuatan utang wajib diisi.";
  }
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
    return "Total utang harus lebih dari 0.";
  }
  return null;
}

export function buildDebtFromInput(
  existing: Debt[],
  input: DebtInput,
): Debt {
  const validationError = validateDebtInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const paidAmount = Math.max(
    0,
    Math.min(input.paidAmount ?? 0, input.totalAmount),
  );
  const remainingAmount = Math.max(0, input.totalAmount - paidAmount);

  return {
    id: generateDebtId(existing),
    transactionId: input.transactionId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    totalAmount: input.totalAmount,
    paidAmount,
    remainingAmount,
    dueDate: input.dueDate,
    status: computeDebtStatus(input.totalAmount, paidAmount),
    paymentHistory:
      paidAmount > 0
        ? [
            {
              id: generatePaymentLogId(),
              date: input.createdAt,
              amount: paidAmount,
              note: "Uang muka / DP saat transaksi",
            },
          ]
        : [],
    createdAt: input.createdAt,
  };
}

/** Utang dengan sisa > 0 yang jatuh tempo dalam 7 hari ke depan */
export function countDebtsDueThisWeek(debts: Debt[], now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return debts.filter((debt) => {
    if (debt.remainingAmount <= 0 || debt.status === "PAID") return false;
    const due = new Date(debt.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    return dueDay >= start && dueDay <= end;
  }).length;
}

export function sumOutstandingDebt(debts: Debt[]): number {
  return debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
}

export function countDebtorCustomers(debts: Debt[]): number {
  const ids = new Set<string>();
  for (const debt of debts) {
    if (debt.remainingAmount > 0 && debt.status !== "PAID") {
      ids.add(debt.customerId);
    }
  }
  return ids.size;
}
