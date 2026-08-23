"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { MobileMenuButton } from "@/src/components/Sidebar";
import { useApp } from "@/src/context/AppContext";

const SIDEBAR_COLLAPSED_KEY = "retail-komputer-sidebar-collapsed";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const isLoginPage = pathname === "/login";
  const isPartnerRoute = pathname.startsWith("/partner");
  const isKasirRoute = pathname.startsWith("/kasir");
  const showSidebar = Boolean(currentUser) && !isLoginPage && !isPartnerRoute;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const mainOffset = showSidebar
    ? collapsed
      ? "lg:pl-[4.5rem]"
      : "lg:pl-64"
    : "";

  const mainClass = isKasirRoute
    ? "min-h-screen bg-slate-100 text-slate-800"
    : "min-h-screen bg-slate-50 text-slate-800";

  return (
    <div className="min-h-screen">
      {showSidebar && (
        <>
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
        </>
      )}
      <main
        className={`w-full transition-all duration-300 print:pl-0 print:bg-white ${mainOffset} ${mainClass}`}
      >
        {children}
      </main>
    </div>
  );
}
