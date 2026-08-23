import { MODE_BADGE } from "@/lib/ui-classes";

type KasirMode = "retail" | "service" | "debt";

const LABELS: Record<KasirMode, string> = {
  retail: "Retail Penjualan",
  service: "Servis",
  debt: "Pembayaran Utang",
};

interface ModeBadgeProps {
  mode: KasirMode;
  className?: string;
}

export default function ModeBadge({ mode, className = "" }: ModeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${MODE_BADGE[mode]} ${className}`.trim()}
    >
      {LABELS[mode]}
    </span>
  );
}
