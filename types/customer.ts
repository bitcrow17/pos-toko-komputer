/** Tipe kategori pelanggan */
export type CustomerType = "REGULAR" | "CORPORATE";

/** Master data pelanggan */
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  type: CustomerType;
  creditLimit?: number;
  createdAt: string;
}

/** Input buat / update pelanggan (id & createdAt diisi sistem) */
export type CustomerInput = {
  name: string;
  phone: string;
  address?: string;
  type: CustomerType;
  creditLimit?: number;
  /** Opsional; jika kosong akan digenerate otomatis */
  code?: string;
};
