"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Retail Komputer
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Masuk ke Sistem
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Gunakan akun Admin atau Kasir untuk melanjutkan.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm text-slate-300">
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin atau kasir"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </label>

            <label className="block text-sm text-slate-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2.5 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-500">
            <p className="font-medium text-slate-400">Akun uji coba</p>
            <p className="mt-1">Admin — admin / admin123</p>
            <p>Kasir — kasir / kasir123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
