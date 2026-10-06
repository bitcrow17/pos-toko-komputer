"use client";

import { AppProvider } from "@/src/context/AppContext";
import { ToastProvider } from "@/src/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppProvider>{children}</AppProvider>
    </ToastProvider>
  );
}
