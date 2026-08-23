import { cn } from "@/lib/utils";
import { deriveStatus } from "./StatusBadge";

/**
 * DecayChip — the MedBridge signature expiry indicator.
 * Mono date + countdown label over a thin bar that depletes as
 * shelf life runs out. Color follows expiry semantics:
 * red < 30d, amber < 90d, green otherwise.
 */
interface DecayChipProps {
  expiryDate: string;
  daysLeft: number;
  /** Days of shelf life the full bar represents. Default 90. */
  horizonDays?: number;
  className?: string;
}

export default function DecayChip({
  expiryDate,
  daysLeft,
  horizonDays = 90,
  className,
}: DecayChipProps) {
  const expired = daysLeft < 0;
  const pct = expired ? 0 : Math.min(100, Math.max(4, (daysLeft / horizonDays) * 100));
  const status = deriveStatus(daysLeft, 1);

  const fill =
    status === "urgent" || status === "expired"
      ? "bg-red-500"
      : status === "approaching"
        ? "bg-amber-500"
        : "bg-green-500";

  const label =
    status === "expired" ? (
      <span className="font-mono text-[11px] font-medium text-red-700">expired</span>
    ) : (
      <span
        className={cn(
          "font-mono text-[11px] font-medium tabular-nums",
          status === "urgent" && "text-red-700",
          status === "approaching" && "text-amber-700",
          status === "stable" && "text-muted-foreground",
        )}
      >
        {daysLeft}d left
      </span>
    );

  return (
    <div className={cn("w-full max-w-40", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs tabular-nums text-foreground">
          {new Date(expiryDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
        {label}
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className={cn("h-full rounded-full transition-all", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
