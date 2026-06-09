"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/kasir", label: "Kasir / Penjualan" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/produk", label: "Manajemen Stok" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin/dashboard" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 sm:w-64"
      aria-label="Navigasi utama"
    >
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Retail Komputer
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">Panel Toko</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/30"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
        Sistem POS & Inventori
      </div>
    </aside>
  );
}
