"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp, type UserRole } from "@/src/context/AppContext";

const NAV_ITEMS: {
  href: string;
  label: string;
  roles: UserRole[];
}[] = [
  { href: "/kasir", label: "Kasir / POS", roles: ["admin", "kasir"] },
  { href: "/admin/dashboard", label: "Dashboard", roles: ["admin"] },
  { href: "/admin/produk", label: "Manajemen Stok", roles: ["admin"] },
  { href: "/admin/transaksi", label: "Riwayat Transaksi", roles: ["admin"] },
  { href: "/admin/customers", label: "Daftar Pelanggan", roles: ["admin"] },
  { href: "/admin/debts", label: "Manajemen Utang", roles: ["admin"] },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === "/admin/dashboard" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useApp();

  if (!currentUser) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(currentUser.role),
  );

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 print:hidden sm:w-64"
      aria-label="Navigasi utama"
    >
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Retail Komputer
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">Panel Toko</h1>
        <p className="mt-1 text-xs capitalize text-slate-400">
          {currentUser.username} · {currentUser.role}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
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

      <div className="border-t border-slate-800 px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-300"
        >
          Logout
        </button>
        <p className="mt-3 px-2 text-center text-xs text-slate-500">
          Sistem POS & Inventori
        </p>
      </div>
    </aside>
  );
}
