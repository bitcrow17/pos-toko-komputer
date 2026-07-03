"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import { useApp } from "@/src/context/AppContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const isLoginPage = pathname === "/login";
  const showSidebar = Boolean(currentUser) && !isLoginPage;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {showSidebar && <Sidebar />}
      <main
        className={`min-h-screen w-full ${showSidebar ? "pl-56 sm:pl-64" : ""}`}
      >
        {children}
      </main>
    </div>
  );
}
