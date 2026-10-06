import type { Customer, CustomerInput, CustomerType } from "@/types/customer";

/** Normalisasi nomor HP untuk perbandingan */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62") && digits.length > 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function generateCustomerId(): string {
  return `CUS-${Date.now()}`;
}

export function generateCustomerCode(id: string): string {
  if (id.startsWith("CUS-")) {
    return `PLG-${id.slice(4)}`;
  }
  return id;
}

export function dedupeCustomers(list: Customer[]): Customer[] {
  const map = new Map<string, Customer>();
  for (const customer of list) {
    map.set(customer.id, customer);
  }
  return Array.from(map.values());
}

export function validateCustomerInput(input: CustomerInput): string | null {
  if (!input.name?.trim()) {
    return "Nama pelanggan / perusahaan wajib diisi.";
  }
  if (!input.phone?.trim()) {
    return "Nomor HP wajib diisi.";
  }
  if (input.type !== "REGULAR" && input.type !== "CORPORATE") {
    return "Tipe pelanggan tidak valid.";
  }
  if (
    input.creditLimit != null &&
    (!Number.isFinite(input.creditLimit) || input.creditLimit < 0)
  ) {
    return "Limit utang harus angka ≥ 0.";
  }
  return null;
}

export function buildCustomerFromInput(
  _existing: Customer[],
  input: CustomerInput,
): Customer {
  const validationError = validateCustomerInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const id = generateCustomerId();
  const code = input.code?.trim() || generateCustomerCode(id);

  return {
    id,
    code,
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address?.trim() || undefined,
    type: input.type,
    creditLimit:
      input.creditLimit != null && Number.isFinite(input.creditLimit)
        ? Math.max(0, input.creditLimit)
        : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function applyCustomerUpdate(
  customer: Customer,
  input: CustomerInput,
): Customer {
  const validationError = validateCustomerInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    ...customer,
    code: input.code?.trim() || customer.code,
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address?.trim() || undefined,
    type: input.type,
    creditLimit:
      input.creditLimit != null && Number.isFinite(input.creditLimit)
        ? Math.max(0, input.creditLimit)
        : undefined,
  };
}

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  REGULAR: "Biasa",
  CORPORATE: "Instansi / Kantor",
};
