"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BTN_PRIMARY, CARD_CLASS, INPUT_CLASS } from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";

export default function LoginPage() {
  const { login } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const success = login(username, password);
    if (!success) {
      setError("Username atau password salah. Silakan coba lagi.");
      setIsSubmitting(false);
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/kasir");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-900/20">
            RK
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">
            Masuk ke Sistem
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Retail Komputer — POS & Manajemen Toko
          </p>
        </div>

        <div className={`${CARD_CLASS} p-6 sm:p-8`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin atau kasir"
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className={`${INPUT_CLASS} mt-1.5`}
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`${BTN_PRIMARY} w-full`}
            >
              {isSubmitting ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Akun uji coba</p>
            <p className="mt-1">Admin — admin / admin123</p>
            <p>Kasir — kasir / kasir123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
