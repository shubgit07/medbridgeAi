"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge, { deriveStatus } from "@/components/StatusBadge";
import API from "@/lib/api";

interface InventoryItem {
  medicine_id: number;
  brand_name: string;
  generic_name: string;
  dosage_form?: string;
  stock_qty: number;
  expiry_date: string;
  price: number;
  days_left: number;
}

const FALLBACK_ITEMS: InventoryItem[] = [
  { medicine_id: 1, brand_name: "Crocin 500mg", generic_name: "Paracetamol", dosage_form: "Tablet", stock_qty: 240, expiry_date: "2026-11-15", price: 28.5, days_left: 182 },
  { medicine_id: 2, brand_name: "Augmentin 625", generic_name: "Amoxicillin", dosage_form: "Tablet", stock_qty: 60, expiry_date: "2026-08-20", price: 185.0, days_left: 28 },
  { medicine_id: 3, brand_name: "Combiflam", generic_name: "Ibuprofen", dosage_form: "Tablet", stock_qty: 8, expiry_date: "2026-08-10", price: 42.0, days_left: 18 },
  { medicine_id: 4, brand_name: "Azithral 500", generic_name: "Azithromycin", dosage_form: "Tablet", stock_qty: 30, expiry_date: "2026-09-05", price: 110.0, days_left: 44 },
  { medicine_id: 5, brand_name: "Dolo 650", generic_name: "Paracetamol", dosage_form: "Tablet", stock_qty: 500, expiry_date: "2027-04-01", price: 30.0, days_left: 684 },
];

type FilterKey = "all" | "stable" | "approaching" | "urgent" | "expired";

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
      return;
    }
    API.get(`/inventory`)
      .then(({ data }) => setItems(Array.isArray(data) && data.length > 0 ? data : FALLBACK_ITEMS))
      .catch(() => setItems(FALLBACK_ITEMS))
      .finally(() => setLoading(false));
  }, [router]);

  const counts = useMemo(
    () => ({
      all: items.length,
      stable: items.filter((i) => deriveStatus(i.days_left, i.stock_qty) === "stable").length,
      approaching: items.filter((i) => deriveStatus(i.days_left, i.stock_qty) === "approaching").length,
      urgent: items.filter((i) => deriveStatus(i.days_left, i.stock_qty) === "urgent").length,
      expired: items.filter((i) => deriveStatus(i.days_left, i.stock_qty) === "expired").length,
    }),
    [items]
  );

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => deriveStatus(i.days_left, i.stock_qty) === filter)),
    [items, filter]
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All Stock (${counts.all})` },
    { key: "stable", label: `Stable (${counts.stable})` },
    { key: "approaching", label: `Approaching (${counts.approaching})` },
    { key: "urgent", label: `Urgent Near-Expiry (${counts.urgent})` },
    { key: "expired", label: `Expired (${counts.expired})` },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
      
      {/* Header Band */}
      <div
        className="fade-in"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
          borderBottom: "1px solid #dddddd",
          paddingBottom: "20px",
        }}
      >
        <div>
          <p className="section-label" style={{ marginBottom: "4px" }}>Pharmacy Stock Management</p>
          <h1 style={{ fontSize: "32px", fontWeight: 500, color: "#181d26", letterSpacing: "-0.02em", margin: 0 }}>
            Inventory Catalog
          </h1>
          <p style={{ fontSize: "14px", color: "#41454d", marginTop: "4px" }}>
            Track batch expiry dates, stock quantities, and dynamic urgency decay
          </p>
        </div>
        <Link
          href="/scan"
          style={{
            background: "#181d26",
            color: "#ffffff",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          + Add Stock Batch
        </Link>
      </div>

      {/* Filter Rail (Vercel Guidelines: aria-pressed & tabular-nums) */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }} role="tablist" aria-label="Stock Status Filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className="tabular-nums"
            style={{
              padding: "6px 16px",
              borderRadius: 9999,
              border: "1px solid",
              cursor: "pointer",
              borderColor: filter === f.key ? "#181d26" : "#dddddd",
              background: filter === f.key ? "#181d26" : "#ffffff",
              color: filter === f.key ? "#ffffff" : "#41454d",
              fontSize: "13px",
              fontWeight: filter === f.key ? 500 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0" }}>
          <span className="spinner" style={{ width: 32, height: 32, marginBottom: 12 }} />
          <span style={{ fontSize: "14px", color: "#41454d" }}>Loading catalog items…</span>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ background: "#ffffff", border: "1px solid #dddddd", borderRadius: "12px", overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.2fr 1fr",
              padding: "12px 20px",
              gap: "12px",
              background: "#f8fafc",
              borderBottom: "1px solid #dddddd",
            }}
          >
            {["Medicine Brand", "Generic Salt", "Stock", "MRP", "Expiry Date", "Status"].map((h) => (
              <span key={h} style={{ fontSize: "11px", fontWeight: 500, color: "#41454d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {h}
              </span>
            ))}
          </div>
          {filtered.map((item, i) => {
            const expiry = new Date(item.expiry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const status = deriveStatus(item.days_left, item.stock_qty);
            return (
              <div
                key={item.medicine_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.2fr 1fr",
                  padding: "14px 20px",
                  gap: "12px",
                  alignItems: "center",
                  borderBottom: i < filtered.length - 1 ? "1px solid #e0e2e6" : "none",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#181d26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.brand_name}</div>
                  {item.dosage_form && <div style={{ fontSize: "12px", color: "#41454d" }}>{item.dosage_form}</div>}
                </div>
                <div style={{ fontSize: "13px", color: "#41454d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.generic_name}</div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: item.stock_qty < 10 ? "#aa2d00" : "#181d26" }} className="tabular-nums">
                  {item.stock_qty} <span style={{ fontWeight: 400, color: "#41454d" }}>units</span>
                </div>
                <div style={{ fontSize: "13px", color: "#181d26" }} className="tabular-nums">₹{item.price.toFixed(2)}</div>
                <div style={{ fontSize: "13px", color: "#41454d" }} className="tabular-nums">{expiry}</div>
                <div>
                  <StatusBadge status={status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ background: "#ffffff", border: "1px solid #dddddd", borderRadius: "12px", textAlign: "center", padding: "64px 32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📦</div>
          <div style={{ fontSize: "18px", fontWeight: 500, color: "#181d26", marginBottom: "8px" }}>
            No medicines match filter &quot;{filter}&quot;
          </div>
          <p style={{ fontSize: "14px", color: "#41454d", maxWidth: "340px", margin: "0 auto 24px" }}>
            Select another status filter or add new stock to your catalog.
          </p>
          <Link
            href="/scan"
            style={{
              background: "#181d26",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            + Add Medicine Batch
          </Link>
        </div>
      )}
    </div>
  );
}