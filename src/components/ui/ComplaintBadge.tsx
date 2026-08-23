import { COMPLAINT_BADGE } from "@/lib/ui-classes";

interface ComplaintBadgeProps {
  className?: string;
  label?: string;
}

export default function ComplaintBadge({
  className = "",
  label = "Komplain / Garansi",
}: ComplaintBadgeProps) {
  return (
    <span className={`${COMPLAINT_BADGE} ${className}`.trim()}>
      {label}
    </span>
  );
}
