"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoreSettings {
  name: string;
  address: string;
  phoneNumber: string;
  whatsapp: string;
  /** base64 data URL of the logo image, or empty string if none */
  logoDataUrl: string;
}

export interface StoreSettingsContextValue {
  settings: StoreSettings;
  updateSettings: (patch: Partial<StoreSettings>) => void;
  resetSettings: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

/** Falls back to the static store-config values so existing struk still work */
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  name: "Retail Komputer",
  address: "Jl. Teknologi No. 45, Bandung 40123",
  phoneNumber: "022-12345678",
  whatsapp: "0812-3456-7890",
  logoDataUrl: "",
};

const LOCAL_STORAGE_KEY = "rk-store-settings-v1";

// ─── Context ─────────────────────────────────────────────────────────────────

const StoreSettingsContext = createContext<StoreSettingsContextValue | null>(
  null,
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(
    DEFAULT_STORE_SETTINGS,
  );

  // Hydrate from localStorage (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoreSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore parse errors — keep defaults
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // quota exceeded or private browsing — silently ignore
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_STORE_SETTINGS);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <StoreSettingsContext.Provider
      value={{ settings, updateSettings, resetSettings }}
    >
      {children}
    </StoreSettingsContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStoreSettings(): StoreSettingsContextValue {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) {
    throw new Error(
      "useStoreSettings must be used inside <StoreSettingsProvider>",
    );
  }
  return ctx;
}

