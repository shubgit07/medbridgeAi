import React from "react";
import StatusBadge, { deriveStatus } from "./StatusBadge";

interface MedicineCardProps {
  brand_name: string;
  generic_name: string;
  dosage_form?: string;
  manufacturer?: string;
  stock: number;
  expiry_date: string;
  price: number;
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
  const today = new Date();
  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const status = deriveStatus(daysLeft, stock);

  const expiryStr = expiry.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #dddddd",
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#181d26",
              lineHeight: 1.3,
            }}
          >
            {brand_name}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#41454d",
              marginTop: "2px",
            }}
          >
            {generic_name}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Meta grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          paddingTop: "10px",
          borderTop: "1px solid #e0e2e6",
        }}
      >
        <MetaItem label="Stock" value={`${stock} units`} />
        <MetaItem label="Price" value={`₹${price.toFixed(2)}`} />
        <MetaItem label="Expiry" value={expiryStr} />
        {dosage_form && <MetaItem label="Form" value={dosage_form} />}
      </div>

      {/* Manufacturer */}
      {manufacturer && (
        <div style={{ fontSize: "12px", color: "#41454d", fontWeight: 400 }}>
          Mfg: {manufacturer}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "#41454d", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: "13px", color: "#181d26", fontWeight: 500, marginTop: "2px" }}>
        {value}
      </div>
    </div>
  );
}
