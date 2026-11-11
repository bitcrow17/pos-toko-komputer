"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useStoreSettings } from "@/src/context/StoreSettingsContext";
import {
  BTN_SECONDARY,
  CARD_CLASS,
  PAGE_WRAPPER,
  STAT_CARD,
} from "@/lib/ui-classes";
import PageHeader from "@/src/components/ui/PageHeader";
import { useApp } from "@/src/context/AppContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Form state ──────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  address: string;
  phoneNumber: string;
  whatsapp: string;
  logoDataUrl: string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { currentUser, partners } = useApp();
  const { settings, updateSettings, resetSettings } = useStoreSettings();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({ ...settings });
  const [logoPreview, setLogoPreview] = useState<string>(settings.logoDataUrl);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setForm({ ...settings });
    setLogoPreview(settings.logoDataUrl);
    setLogoError(null);
    setSaved(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setLogoError(null);
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setLogoError("File harus berupa gambar (PNG, JPG, SVG, dll.)");
      return;
    }
    // Validate size (max 1 MB encoded ≈ ~750 KB file)
    if (file.size > 750 * 1024) {
      setLogoError("Ukuran file logo maksimal 750 KB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogoPreview(dataUrl);
      setForm((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    } catch {
      setLogoError("Gagal membaca file gambar. Coba lagi.");
    }
  }

  function removeLogo() {
    setLogoPreview("");
    setForm((prev) => ({ ...prev, logoDataUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSave() {
    updateSettings(form);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleReset() {
    if (
      window.confirm(
        "Reset semua pengaturan toko ke nilai bawaan? Tindakan ini tidak bisa dibatalkan.",
      )
    ) {
      resetSettings();
      setEditing(false);
      setSaved(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={PAGE_WRAPPER}>
      <PageHeader
        title="Pengaturan Toko / User"
        subtitle="Informasi toko, akun aktif, dan tautan portal mitra servis."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Profil Toko ──────────────────────────────────────── */}
        <section className={`${CARD_CLASS} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Profil Toko
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Data identitas toko yang tercetak pada struk dan tanda terima
                servis.
              </p>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="shrink-0 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Edit
              </button>
            )}
          </div>

          {saved && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              ✓ Pengaturan toko berhasil disimpan.
            </p>
          )}

          {editing ? (
            /* ── Form Edit ── */
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              {/* Logo */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Logo Toko
                </label>
                <div className="flex items-start gap-4">
                  {logoPreview ? (
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoPreview}
                        alt="Preview logo"
                        className="h-16 w-16 rounded-lg border border-slate-200 object-contain bg-slate-50 p-1"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600"
                        aria-label="Hapus logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 3h18"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      PNG, JPG, SVG — maks. 750 KB. Logo tampil di header
                      semua struk.
                    </p>
                    {logoError && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {logoError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nama Toko */}
              <div>
                <label
                  htmlFor="store-name"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Nama Toko
                </label>
                <input
                  id="store-name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Contoh: Toko Komputer Maju"
                />
              </div>

              {/* Alamat */}
              <div>
                <label
                  htmlFor="store-address"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Alamat
                </label>
                <textarea
                  id="store-address"
                  name="address"
                  rows={2}
                  value={form.address}
                  onChange={handleChange}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Jl. Contoh No. 1, Kota"
                />
              </div>

              {/* Telepon & WA */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="store-phone"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Telepon
                  </label>
                  <input
                    id="store-phone"
                    name="phoneNumber"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="021-1234567"
                  />
                </div>
                <div>
                  <label
                    htmlFor="store-wa"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    WhatsApp
                  </label>
                  <input
                    id="store-wa"
                    name="whatsapp"
                    type="tel"
                    value={form.whatsapp}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="0812-3456-7890"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="ml-auto text-xs font-medium text-red-500 transition hover:text-red-700"
                >
                  Reset ke Bawaan
                </button>
              </div>
            </form>
          ) : (
            /* ── View Mode ── */
            <dl className="mt-6 space-y-4">
              {/* Logo preview */}
              {settings.logoDataUrl && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Logo Toko
                  </dt>
                  <dd className="mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={settings.logoDataUrl}
                      alt="Logo toko"
                      className="h-14 rounded-lg border border-slate-200 object-contain bg-slate-50 p-1"
                    />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nama Toko
                </dt>
                <dd className="mt-1 text-base font-medium text-slate-800">
                  {settings.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Alamat
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {settings.address}
                </dd>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Telepon
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {settings.phoneNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    WhatsApp
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {settings.whatsapp}
                  </dd>
                </div>
              </div>
            </dl>
          )}
        </section>

        {/* ── Akun Aktif ───────────────────────────────────────── */}
        <section className={`${CARD_CLASS} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800">Akun Aktif</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pengguna yang sedang login ke sistem.
          </p>

          {currentUser ? (
            <div className={`${STAT_CARD} mt-6`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Username
              </p>
              <p className="mt-1 text-xl font-bold capitalize text-slate-800">
                {currentUser.username}
              </p>
              <p className="mt-3 inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">
                Role: {currentUser.role}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">Tidak ada sesi aktif.</p>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Akun uji coba</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>Admin — admin / admin123</li>
              <li>Kasir — kasir / kasir123</li>
            </ul>
          </div>
        </section>

        {/* ── Portal Mitra ──────────────────────────────────────── */}
        <section className={`${CARD_CLASS} p-6 lg:col-span-2`}>
          <h2 className="text-lg font-semibold text-slate-800">
            Portal Mitra Servis
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tautan terisolasi untuk mitra rekan — hanya menampilkan tiket servis
            yang ditugaskan ke mitra masing-masing.
          </p>

          {partners.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Belum ada mitra terdaftar. Tambahkan mitra di menu Manajemen
              Servis.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <li
                  key={partner.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-medium text-slate-800">{partner.name}</p>
                  <p className="text-xs text-slate-500">{partner.phone}</p>
                  <Link
                    href={`/partner/services?partnerId=${partner.id}`}
                    className={`${BTN_SECONDARY} mt-3 w-full text-xs`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka Portal Mitra
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
