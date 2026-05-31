import Link from "next/link";
import { mockProducts, mockTransactions } from "@/lib/mock-data";

export default function Home() {
  const totalProduk = mockProducts.length;
  const totalTransaksi = mockTransactions.length;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Retail Komputer
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard Admin
          </h1>
          <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
            Ringkasan inventori dan transaksi toko (data contoh statis).
          </p>
          <Link
            href="/kasir"
            className="mt-6 inline-flex items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Buka Kasir (POS)
          </Link>
        </header>

        <section aria-labelledby="ringkasan-heading">
          <h2
            id="ringkasan-heading"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Ringkasan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total Produk" value={totalProduk} />
            <StatCard label="Total Transaksi" value={totalTransaksi} />
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-3 text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value.toLocaleString("id-ID")}
      </p>
    </article>
  );
}
