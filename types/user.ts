/** Tingkat akses pengguna aplikasi */
export type UserLevel =
  | "admin" // akses penuh
  | "manager" // kelola inventori & laporan
  | "cashier" // transaksi & keranjang
  | "viewer"; // hanya lihat data

/** Akun pengguna aplikasi */
export interface User {
  /** ID unik pengguna */
  id: string;
  /** Nama pengguna untuk login */
  username: string;
  /** Kata sandi (simpan ter-hash di produksi) */
  password: string;
  /** Level hak akses aplikasi */
  level: UserLevel;
}
