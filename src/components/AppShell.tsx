"use client";

import Sidebar from "@/src/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="min-h-screen w-full pl-56 sm:pl-64">{children}</main>
    </div>
  );
}
