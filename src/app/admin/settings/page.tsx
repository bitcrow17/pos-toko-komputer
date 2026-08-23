"use client";

import Link from "next/link";
import { STORE_INFO } from "@/lib/store-config";
import {
  BTN_SECONDARY,
  CARD_CLASS,
  PAGE_WRAPPER,
  STAT_CARD,
} from "@/lib/ui-classes";
import PageHeader from "@/src/components/ui/PageHeader";
import { useApp } from "@/src/context/AppContext";

export default function AdminSettingsPage() {
  const { currentUser, partners } = useApp();

  return (
    <div className={PAGE_WRAPPER}>
      <PageHeader
        title="Pengaturan Toko / User"
        subtitle="Informasi toko, akun aktif, dan tautan portal mitra servis."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${CARD_CLASS} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800">
            Profil Toko
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Data identitas toko yang tercetak pada struk dan tanda terima servis.
          </p>

          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nama Toko
              </dt>
              <dd className="mt-1 text-base font-medium text-slate-800">
                {STORE_INFO.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Alamat
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{STORE_INFO.address}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Telepon
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {STORE_INFO.phoneNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  WhatsApp
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {STORE_INFO.whatsapp}
                </dd>
              </div>
            </div>
          </dl>
        </section>

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
              Belum ada mitra terdaftar. Tambahkan mitra di menu Manajemen Servis.
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
