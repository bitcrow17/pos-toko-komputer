# POS & Service App Context

## Tech Stack
- Next.js (App Router), Supabase PostgreSQL, Tailwind CSS, TypeScript.

## Core Files & Architecture
- Data Access: `src/lib/supabase-db.ts` (Query database terpusat di sini).
- State Management: `src/context/AppContext.tsx` (Global state aplikasi).
- Ticket Logic: Penomoran tiket servis menggunakan `getNextServiceTicketNo()` dari DB.
- Module Navigation: `src/components/ModuleNav.tsx` (Navigasi cepat antar rute `/retail`, `/service`, `/debt`).

## Focus Next Tasks
1. [DONE] Pemisahan halaman/rute terpisah (`/retail`, `/service`, `/debt`).
2. Update catatan servis & status komplain mitra secara independen.
3. Optimalisasi cetak 80mm & fitur cetak/unduh nota PDF digital.
