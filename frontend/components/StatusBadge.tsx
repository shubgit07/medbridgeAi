import { cn } from "@/lib/utils";

export type BadgeStatus = "stable" | "approaching" | "urgent" | "info" | "expired";

export interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

const STATUS_STYLES: Record<BadgeStatus, { wrap: string; dot: string; defaultLabel: string }> = {
  stable: {
    wrap: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
    dot: "bg-green-500",
    defaultLabel: "Stable",
  },
  approaching: {
    wrap: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/25",
    dot: "bg-amber-500",
    defaultLabel: "Approaching",
  },
  urgent: {
    wrap: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
    dot: "bg-red-500",
    defaultLabel: "Low Stock",
  },
  info: {
    wrap: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    dot: "bg-blue-500",
    defaultLabel: "Tracked",
  },
  expired: {
    wrap: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-700/30",
    dot: "bg-red-600",
    defaultLabel: "Expired",
  },
};

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const cfg = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium tracking-wide whitespace-nowrap",
        cfg.wrap,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", cfg.dot)} aria-hidden="true" />
      {label ?? cfg.defaultLabel}
    </span>
  );
}

/** Helper: derive status from days until expiry + stock */
export function deriveStatus(daysLeft: number, stock: number): BadgeStatus {
  if (daysLeft < 0) return "expired";
  if (daysLeft < 30) return "urgent";
  if (daysLeft < 90) return "approaching";
  if (stock === 0) return "urgent";
  return "stable";
}
