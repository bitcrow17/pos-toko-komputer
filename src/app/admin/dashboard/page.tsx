"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildCatalog } from "@/lib/kasir-catalog";
import {
  TABLE_BODY_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
} from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";
import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";

const LOW_STOCK_THRESHOLD = 3;
const CHART_OMZET_COLOR = "#6366f1";
const CHART_PROFIT_COLOR = "#10b981";

export interface MonthlyPerformancePoint {
  bulan: string;
  monthKey: string;
  pendapatan: number;
  keuntunganBersih: number;
}

/** Mengelompokkan transaksi ke 3 bulan terakhir (2 bln lalu → bulan ini). */
export function buildLastThreeMonthsPerformance(
  transactions: Transaction[],
  products: Product[],
  now: Date = new Date(),
): MonthlyPerformancePoint[] {
  const purchasePriceById = new Map(
    products.map((p) => [p.id, p.purchasePrice]),
  );

  const buckets: MonthlyPerformancePoint[] = [];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      bulan: date.toLocaleDateString("id-ID", { month: "short" }),
      monthKey: `${date.getFullYear()}-${date.getMonth()}`,
      pendapatan: 0,
      keuntunganBersih: 0,
    });
  }

  const bucketByKey = new Map(buckets.map((b) => [b.monthKey, b]));

  for (const tx of transactions) {
    const txDate = new Date(tx.timestamp);
    if (Number.isNaN(txDate.getTime())) continue;

    const monthKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
    const bucket = bucketByKey.get(monthKey);
    if (!bucket) continue;

    bucket.pendapatan += tx.totalHarga;
    bucket.keuntunganBersih += tx.items.reduce((sum, item) => {
      const hargaBeli = purchasePriceById.get(item.productId) ?? 0;
      return sum + (item.unitPrice - hargaBeli) * item.quantity;
    }, 0);
  }

  return buckets;
}

function formatAxisRupiah(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)} jt`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(0)} rb`;
  }
  return value.toLocaleString("id-ID");
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getLowStockRowClass(stock: number): string {
  if (stock <= 0) return "bg-red-50/60";
  return "bg-amber-50/40";
}

function getLowStockBadgeClass(stock: number): string {
  if (stock <= 0) {
    return "rounded-lg border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700";
  }
  return "rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700";
}

export default function AdminDashboardPage() {
  const { products, transactions } = useApp();

  const totalPendapatan = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.totalHarga, 0),
    [transactions],
  );

  const totalStokKomponen = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products],
  );

  const productCodeById = useMemo(() => {
    const catalog = buildCatalog(products);
    return new Map(catalog.map((p) => [p.id, p.productCode]));
  }, [products]);

  const lowStockProducts = useMemo(
    () =>
      [...products]
        .filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)),
    [products],
  );

  const monthlyPerformance = useMemo(
    () => buildLastThreeMonthsPerformance(transactions, products),
    [transactions, products],
  );

  const topSellingProducts = useMemo(() => {
    const qtyByProduct = new Map<
      string,
      { productId: string; productName: string; totalQty: number }
    >();

    for (const tx of transactions) {
      for (const item of tx.items) {
        const existing = qtyByProduct.get(item.productId);
        if (existing) {
          existing.totalQty += item.quantity;
        } else {
          qtyByProduct.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            totalQty: item.quantity,
          });
        }
      }
    }

    return [...qtyByProduct.values()]
      .sort((a, b) => b.totalQty - a.totalQty || a.productName.localeCompare(b.productName))
      .slice(0, 5);
  }, [transactions]);

  const overviewCards = [
    {
      label: "Total Pendapatan",
      value: formatRupiah(totalPendapatan),
      accent: "text-indigo-600",
    },
    {
      label: "Total Transaksi",
      value: transactions.length.toLocaleString("id-ID"),
      accent: "text-slate-800",
    },
    {
      label: "Total Produk Aktif",
      value: products.length.toLocaleString("id-ID"),
      accent: "text-slate-800",
    },
    {
      label: "Total Stok Komponen",
      value: totalStokKomponen.toLocaleString("id-ID"),
      accent: "text-slate-800",
    },
  ];

  return (
    <div className="p-6 sm:p-8 print:hidden">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Dashboard Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pusat ringkasan performa toko — data produk & transaksi dari state
          global.
        </p>
      </header>

      <section
        aria-label="Ringkasan statistik utama"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {overviewCards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${card.accent}`}
            >
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <PerformanceChartSection data={monthlyPerformance} />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <LowStockSection
          products={lowStockProducts}
          productCodeById={productCodeById}
        />

        <TopSellingSection products={topSellingProducts} />
      </div>
    </div>
  );
}

function PerformanceChartSection({ data }: { data: MonthlyPerformancePoint[] }) {
  const hasAnyValue = data.some(
    (point) => point.keuntunganBersih > 0 || point.pendapatan > 0,
  );

  return (
    <section
      aria-label="Analisis performa 3 bulan terakhir"
      className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">
          Analisis Performa 3 Bulan Terakhir
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Perbandingan omzet (pendapatan) dan keuntungan bersih per bulan
        </p>
      </div>

      <div className="px-2 py-6 sm:px-5">
        {!hasAnyValue ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Belum ada transaksi pada 3 bulan terakhir. Grafik akan terisi
            otomatis setelah penjualan tercatat di Kasir.
          </p>
        ) : (
          <div className="h-80 w-full min-w-0 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis
                  dataKey="bulan"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                />
                <YAxis
                  tickFormatter={formatAxisRupiah}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                  labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                  itemStyle={{ color: "#cbd5e1" }}
                  formatter={(value, name) => [
                    formatRupiah(Number(value)),
                    name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => (
                    <span className="text-xs text-slate-400">{value}</span>
                  )}
                />
                <Bar
                  dataKey="pendapatan"
                  name="Pendapatan (Omzet)"
                  fill={CHART_OMZET_COLOR}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="keuntunganBersih"
                  name="Keuntungan Bersih"
                  fill={CHART_PROFIT_COLOR}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

function LowStockSection({
  products,
  productCodeById,
}: {
  products: Product[];
  productCodeById: Map<string, string>;
}) {
  const hasAlert = products.length > 0;

  return (
    <section
      aria-label="Peringatan stok menipis"
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        hasAlert
          ? "border-amber-200 bg-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`border-b px-5 py-4 ${
          hasAlert
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <h2 className="text-base font-semibold text-slate-800">
          Peringatan Stok Menipis
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Produk dengan stok {LOW_STOCK_THRESHOLD} unit atau kurang
        </p>
      </div>

      {hasAlert ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={TABLE_HEAD_CLASS}>
              <tr>
                <th className="px-4 py-3">Kode Barang</th>
                <th className="px-4 py-3">Nama Produk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Sisa Stok</th>
              </tr>
            </thead>
            <tbody className={TABLE_BODY_CLASS}>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={`${TABLE_ROW_CLASS} ${getLowStockRowClass(product.stock)}`}
                >
                  <td className="px-4 py-3 font-mono text-sm text-indigo-700">
                    {productCodeById.get(product.id) ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {product.name}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-500">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex min-w-[2.5rem] justify-center tabular-nums ${getLowStockBadgeClass(product.stock)}`}
                    >
                      {product.stock}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          Semua stok barang dalam kondisi aman.
        </p>
      )}
    </section>
  );
}

function TopSellingSection({
  products,
}: {
  products: { productId: string; productName: string; totalQty: number }[];
}) {
  return (
    <section
      aria-label="Produk terlaris"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-800">Produk Terlaris</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          5 produk dengan total unit terjual tertinggi
        </p>
      </div>

      {products.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          Belum ada data penjualan. Selesaikan transaksi di Kasir untuk melihat
          produk terlaris.
        </p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {products.map((item, index) => (
            <li
              key={item.productId}
              className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${
                  index === 0
                    ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">
                  {item.productName}
                </p>
                <p className="text-xs text-slate-500">{item.productId}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-slate-800">
                  {item.totalQty.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-slate-500">unit terjual</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
