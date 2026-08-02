import React from "react";

type BadgeStatus = "stable" | "approaching" | "urgent" | "info" | "expired";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

const STATUS_CONFIG: Record<BadgeStatus, { bg: string; color: string; defaultLabel: string }> = {
  stable:      { bg: "var(--clr-stable-bg)",      color: "var(--clr-stable)",      defaultLabel: "Stable"      },
  approaching: { bg: "var(--clr-approaching-bg)",  color: "var(--clr-approaching)", defaultLabel: "Approaching" },
  urgent:      { bg: "var(--clr-urgent-bg)",       color: "var(--clr-urgent)",      defaultLabel: "Low Stock"   },
  info:        { bg: "var(--clr-info-bg)",          color: "var(--clr-info)",        defaultLabel: "Tracked"     },
  expired:     { bg: "var(--clr-error-container)",  color: "var(--clr-error)",       defaultLabel: "Expired"     },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display:         "inline-flex",
        alignItems:      "center",
        gap:             "4px",
        background:      cfg.bg,
        color:           cfg.color,
        borderRadius:    "var(--r-full)",
        fontSize:        "var(--fs-label-sm)",
        fontWeight:      700,
        letterSpacing:   "0.03em",
        padding:         "2px 10px",
        whiteSpace:      "nowrap",
        textTransform:   "uppercase",
      }}
    >
      <span
        style={{
          width:        "5px",
          height:       "5px",
          borderRadius: "50%",
          background:   cfg.color,
          flexShrink:   0,
        }}
      />
      {label ?? cfg.defaultLabel}
    </span>
  );
}

/** Helper: derive status from days until expiry + stock */
export function deriveStatus(daysLeft: number, stock: number): BadgeStatus {
  if (daysLeft < 0)  return "expired";
  if (daysLeft < 30) return "urgent";
  if (daysLeft < 90) return "approaching";
  if (stock === 0)   return "urgent";
  return "stable";
}
