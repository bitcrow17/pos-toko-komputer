"use client";

import { useApp } from "@/src/context/AppContext";

export default function AdminDashboardPage() {
  const { products } = useApp();

  const totalStok = products.reduce((sum, p) => sum + p.stock, 0);
  const habis = products.filter((p) => p.stock <= 0).length;
  const nilaiInventori = products.reduce(
    (sum, p) => sum + p.purchasePrice * p.stock,
    0,
  );

  return (
    <div className="p-6 sm:p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Ringkasan inventori dari data global (sinkron dengan Kasir & Admin).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total Produk</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
            {products.length}
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total Unit Stok</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
            {totalStok}
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Produk Stok Habis</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-red-400">
            {habis}
          </p>
        </article>
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Nilai inventori (harga beli × stok)</p>
        <p className="mt-2 text-xl font-semibold tabular-nums text-cyan-300">
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(nilaiInventori)}
        </p>
      </section>
    </div>
  );
}
