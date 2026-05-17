import React from "react";
import StatusBadge, { deriveStatus } from "./StatusBadge";

interface MedicineCardProps {
  brand_name:   string;
  generic_name: string;
  dosage_form?: string;
  manufacturer?: string;
  stock:        number;
  expiry_date:  string; // ISO date string
  price:        number;
  user_id?:     number;
}

export default function MedicineCard({
  brand_name,
  generic_name,
  dosage_form,
  manufacturer,
  stock,
  expiry_date,
  price,
}: MedicineCardProps) {
  const expiry = new Date(expiry_date);
  const today  = new Date();
  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const status   = deriveStatus(daysLeft, stock);

  const expiryStr = expiry.toLocaleDateString("en-GB", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });

  return (
    <div
      className="card fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <div
            style={{
              fontSize:   "var(--fs-body-md)",
              fontWeight: 700,
              color:      "var(--clr-on-surface)",
              lineHeight: 1.3,
            }}
          >
            {brand_name}
          </div>
          <div
            style={{
              fontSize: "var(--fs-body-sm)",
              color:    "var(--clr-on-surface-variant)",
              marginTop: "2px",
            }}
          >
            {generic_name}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Meta row */}
      <div
        style={{
          display:        "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:            "8px",
          paddingTop:     "8px",
          borderTop:      "1px solid var(--clr-outline-variant)",
        }}
      >
        <MetaItem label="Stock" value={`${stock} units`} />
        <MetaItem label="Price" value={`₹${price.toFixed(2)}`} />
        <MetaItem label="Expiry" value={expiryStr} />
        {dosage_form && <MetaItem label="Form" value={dosage_form} />}
      </div>

      {/* Manufacturer */}
      {manufacturer && (
        <div style={{ fontSize: "var(--fs-label-md)", color: "var(--clr-outline)" }}>
          {manufacturer}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "var(--fs-label-sm)", color: "var(--clr-outline)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface)", fontWeight: 500, marginTop: "2px" }}>
        {value}
      </div>
    </div>
  );
}
