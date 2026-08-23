"use client";

import { cn } from "@/lib/utils";
import StatusBadge, { deriveStatus } from "./StatusBadge";
import DecayChip from "./decay-chip";

export interface MedicineCardProps {
  brand_name: string;
  generic_name?: string;
  dosage_form?: string;
  manufacturer?: string;
  /** Optional — hidden when the catalog has no stock data for this drug */
  stock?: number;
  /** Optional — decay chip is hidden when there's no expiry data */
  expiry_date?: string;
  /** Days until expiry — computed by the caller at data-fetch time */
  days_left?: number;
  price?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function MedicineCard({
  brand_name,
  generic_name,
  dosage_form,
  manufacturer,
  stock,
  expiry_date,
  days_left,
  price,
  isSelected,
  onSelect,
}: MedicineCardProps) {
  const hasExpiry = Boolean(expiry_date && days_left !== undefined);
  const status =
    hasExpiry && days_left !== undefined
      ? deriveStatus(days_left, stock ?? 1)
      : null;

  return (
    <div
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      aria-pressed={onSelect ? isSelected : undefined}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5 transition-all outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand",
        onSelect && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        isSelected
          ? "border-[var(--mb-ink)] ring-1 ring-[var(--mb-ink)]"
          : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {brand_name}
          </h3>
          {generic_name && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {generic_name}
            </p>
          )}
        </div>
        {status && <StatusBadge status={status} />}
      </div>

      {/* Meta */}
      {(stock !== undefined || price !== undefined || dosage_form) && (
        <>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-3 gap-3">
            {stock !== undefined && (
              <Meta label="Stock">
                <span
                  className={cn(
                    "font-mono text-sm font-medium tabular-nums",
                    stock > 0 && stock < 10 && "text-red-600",
                  )}
                >
                  {stock}
                </span>
              </Meta>
            )}
            {price !== undefined && (
              <Meta label="MRP">
                <span className="font-mono text-sm font-medium tabular-nums">
                  ₹{price.toFixed(2)}
                </span>
              </Meta>
            )}
            {dosage_form && (
              <Meta label="Form">
                <span className="text-xs text-foreground">{dosage_form}</span>
              </Meta>
            )}
          </div>
        </>
      )}

      {/* Decay chip */}
      {hasExpiry && expiry_date && days_left !== undefined && (
        <DecayChip expiryDate={expiry_date} daysLeft={days_left} />
      )}

      {/* Manufacturer */}
      {manufacturer && (
        <p className="truncate text-xs text-muted-foreground">Mfg: {manufacturer}</p>
      )}
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium tracking-[0.05em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
