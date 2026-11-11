"use client";

import { AppProvider } from "@/src/context/AppContext";
import { StoreSettingsProvider } from "@/src/context/StoreSettingsContext";
import { ToastProvider } from "@/src/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <StoreSettingsProvider>
        <AppProvider>{children}</AppProvider>
      </StoreSettingsProvider>
    </ToastProvider>
  );
}
