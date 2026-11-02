"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/src/context/AppContext";

export type AppModule = "retail" | "service" | "debt";

interface ModuleNavProps {
  title?: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function DebtIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
      <path d="m15 15 2 2 4-4" />
    </svg>
  );
}

export default function ModuleNav({
  title,
  subtitle = "Retail Komputer POS",
  rightContent,
}: ModuleNavProps) {
  const pathname = usePathname();
  const { services, debts } = useApp();

  const isRetailActive = pathname.startsWith("/retail") || pathname === "/kasir";
  const isServiceActive = pathname.startsWith("/service") || pathname.startsWith("/servis");
  const isDebtActive = pathname.startsWith("/debt") || pathname.startsWith("/utang");

  const activeServicesCount = services.filter(
    (s) => s.status === "QUEUED" || s.status === "PROCESSING",
  ).length;

  const unpaidDebtsCount = debts.filter((d) => d.remainingAmount > 0).length;

  const resolvedTitle =
    title ??
    (isRetailActive
      ? "Kasir / Penjualan Retail"
      : isServiceActive
        ? "Manajemen Servis & Garansi"
        : isDebtActive
          ? "Pencatatan Utang / Piutang"
          : "Sistem Operasional");

  return (
    <header className="border-b border-slate-200 bg-white shadow-xs print:hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6">
        {/* Top row: Brand & Module Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                {subtitle}
              </p>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {resolvedTitle}
              </h1>
            </div>
          </div>

          {/* Quick Route Switcher Tabs */}
          <nav
            aria-label="Navigasi Modul Utama"
            className="inline-flex rounded-xl bg-slate-100 p-1 shadow-inner"
          >
            <Link
              href="/retail"
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                isRetailActive
                  ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
              aria-current={isRetailActive ? "page" : undefined}
            >
              <ShoppingCartIcon className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>Retail</span>
            </Link>

            <Link
              href="/service"
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                isServiceActive
                  ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
              aria-current={isServiceActive ? "page" : undefined}
            >
              <WrenchIcon className="h-4 w-4 shrink-0 text-violet-600" />
              <span>Servis</span>
              {activeServicesCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-violet-100 px-1.5 py-0.2 text-[10px] font-bold text-violet-700">
                  {activeServicesCount}
                </span>
              )}
            </Link>

            <Link
              href="/debt"
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                isDebtActive
                  ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
              aria-current={isDebtActive ? "page" : undefined}
            >
              <DebtIcon className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Utang</span>
              {unpaidDebtsCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                  {unpaidDebtsCount}
                </span>
              )}
            </Link>
          </nav>
        </div>

        {/* Optional Right/Bottom Action Content (Search / Modals / Selectors) */}
        {rightContent && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}

