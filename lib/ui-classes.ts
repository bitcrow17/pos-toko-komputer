/** Shared Tailwind class strings for consistent light-mode design system */

export const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20";

export const SELECT_CLASS =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20";

export const CARD_CLASS =
  "rounded-2xl border border-slate-200 bg-white shadow-sm";

export const TABLE_WRAPPER_CLASS =
  "overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm";

export const TABLE_CLASS = "min-w-full text-sm";

export const TABLE_HEAD_CLASS =
  "bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-700";

export const TABLE_TH_CLASS = "px-4 py-3 text-left";

export const TABLE_BODY_CLASS = "bg-white";

export const TABLE_ROW_CLASS =
  "border-b border-slate-100 bg-white text-sm text-slate-800 transition-colors hover:bg-slate-50";

export const TABLE_TD_CLASS = "px-4 py-3";

export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500";

export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export const BTN_SUCCESS =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500";

export const BTN_DANGER =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50";

export const TAB_GROUP_CLASS =
  "inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-100 p-1";

export function tabButtonClass(
  active: boolean,
  accent: "indigo" | "violet" | "amber" = "indigo",
): string {
  const activeColors = {
    indigo: "bg-indigo-600 text-white shadow-sm",
    violet: "bg-violet-600 text-white shadow-sm",
    amber: "bg-amber-600 text-white shadow-sm",
  };
  return `rounded-lg px-4 py-2 text-sm font-medium transition ${
    active
      ? activeColors[accent]
      : "text-slate-600 hover:bg-white hover:text-slate-900"
  }`;
}

export const PAGE_WRAPPER = "p-6 sm:p-8 print:hidden";

export const PAGE_TITLE = "text-2xl font-bold tracking-tight text-slate-800";

export const PAGE_SUBTITLE = "mt-1 text-sm text-slate-500";

export const STAT_CARD =
  "rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm";

export const MODE_BADGE = {
  retail: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  service: "bg-violet-50 text-violet-700 border border-violet-200",
  debt: "bg-amber-50 text-amber-700 border border-amber-200",
} as const;

export const STATUS_BADGE = {
  unpaid: "rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700",
  pending: "rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700",
  partial: "rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700",
  paid: "rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700",
  completed: "rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700",
  complaint: "rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 animate-pulse",
  cancelled: "rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700",
} as const;

export const COMPLAINT_BADGE = STATUS_BADGE.complaint;

export const MODAL_OVERLAY = "absolute inset-0 bg-slate-900/40 backdrop-blur-sm";

export const MODAL_PANEL =
  "relative z-10 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl";
