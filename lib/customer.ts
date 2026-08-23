import type { Customer, CustomerInput, CustomerType } from "@/types/customer";

export function generateCustomerId(existing: Customer[]): string {
  const count = existing.length + 1;
  return `CUS-${String(count).padStart(4, "0")}`;
}

export function generateCustomerCode(existing: Customer[]): string {
  const count = existing.length + 1;
  return `PLG-${String(count).padStart(4, "0")}`;
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
  existing: Customer[],
  input: CustomerInput,
): Customer {
  const validationError = validateCustomerInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const code = input.code?.trim() || generateCustomerCode(existing);

  return {
    id: generateCustomerId(existing),
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
