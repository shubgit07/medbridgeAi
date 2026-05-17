"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge, { deriveStatus } from "../../components/StatusBadge";

interface InventoryItem {
  medicine_id:  number;
  brand_name:   string;
  generic_name: string;
  dosage_form?:  string;
  manufacturer?: string;
  stock_qty:     number;
  expiry_date:   string;
  price:         number;
  days_left:     number;
  inventory_id?: number;
}

// ─── MOCK DATA (remove when backend is live) ───────────────────────────────
const MOCK_ITEMS: InventoryItem[] = [
  { medicine_id: 1, brand_name: "Crocin 500mg",   generic_name: "Paracetamol",   dosage_form: "Tablet",  manufacturer: "GSK",         stock_qty: 240, expiry_date: "2026-11-15", price: 28.50,  days_left: 182, inventory_id: 1 },
  { medicine_id: 2, brand_name: "Augmentin 625",  generic_name: "Amoxicillin",   dosage_form: "Tablet",  manufacturer: "GSK",         stock_qty: 60,  expiry_date: "2025-07-20", price: 185.00, days_left: 64,  inventory_id: 2 },
  { medicine_id: 3, brand_name: "Combiflam",      generic_name: "Ibuprofen",     dosage_form: "Tablet",  manufacturer: "Sanofi",      stock_qty: 8,   expiry_date: "2025-06-10", price: 42.00,  days_left: 24,  inventory_id: 3 },
  { medicine_id: 4, brand_name: "Metformin 500",  generic_name: "Metformin HCl", dosage_form: "Tablet",  manufacturer: "Sun Pharma",  stock_qty: 0,   expiry_date: "2026-03-01", price: 15.00,  days_left: 288, inventory_id: 4 },
  { medicine_id: 5, brand_name: "Allegra 120",    generic_name: "Fexofenadine",  dosage_form: "Tablet",  manufacturer: "Sanofi",      stock_qty: 150, expiry_date: "2027-01-10", price: 95.00,  days_left: 604, inventory_id: 5 },
  { medicine_id: 6, brand_name: "Azithral 500",   generic_name: "Azithromycin",  dosage_form: "Tablet",  manufacturer: "Alembic",     stock_qty: 30,  expiry_date: "2025-05-30", price: 110.00, days_left: 13,  inventory_id: 6 },
  { medicine_id: 7, brand_name: "Pantop 40",      generic_name: "Pantoprazole",  dosage_form: "Capsule", manufacturer: "Aristo",      stock_qty: 90,  expiry_date: "2026-08-25", price: 65.00,  days_left: 465, inventory_id: 7 },
  { medicine_id: 8, brand_name: "Dolo 650",       generic_name: "Paracetamol",   dosage_form: "Tablet",  manufacturer: "Micro Labs",  stock_qty: 500, expiry_date: "2027-04-01", price: 30.00,  days_left: 684, inventory_id: 8 },
];
// ───────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const [items,    setItems]    = useState<InventoryItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [isMock,   setIsMock]   = useState(false);
  const [filter,   setFilter]   = useState<"all" | "stable" | "approaching" | "urgent" | "expired">("all");

  useEffect(() => {
    const userId = localStorage.getItem("token");
    if (!userId) { router.push("/signin"); return; }

    fetch(`http://localhost:8000/inventory?user_id=${userId}`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); })
      .catch(() => {
        // ← Backend unavailable: load mock data for UI testing
        setItems(MOCK_ITEMS);
        setIsMock(true);
      })
      .finally(() => setLoading(false));
  }, [router]);


  const filtered = filter === "all"
    ? items
    : items.filter(i => deriveStatus(i.days_left, i.stock_qty) === filter);

  const counts = {
    all:         items.length,
    stable:      items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "stable").length,
    approaching: items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "approaching").length,
    urgent:      items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "urgent").length,
    expired:     items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "expired").length,
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all",         label: `All (${counts.all})`                 },
    { key: "stable",      label: `Stable (${counts.stable})`           },
    { key: "approaching", label: `Approaching (${counts.approaching})` },
    { key: "urgent",      label: `Urgent (${counts.urgent})`           },
    { key: "expired",     label: `Expired (${counts.expired})`         },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "36px 48px", boxSizing: "border-box" }}>

      {/* ── Mock data notice ── */}
      {isMock && (
        <div style={{
          background:   "#fef3c7",
          border:       "1px solid #f59e0b",
          borderRadius: "var(--r-md)",
          padding:      "10px 16px",
          marginBottom: "20px",
          fontSize:     "var(--fs-body-sm)",
          color:        "#92400e",
          display:      "flex",
          alignItems:   "center",
          gap:          "8px",
        }}>
          <span>⚠️</span>
          <span><strong>Mock data mode</strong> — Backend not connected. Showing sample inventory for UI testing. Remove <code>MOCK_ITEMS</code> from inventory/page.tsx when backend is live.</span>
        </div>
      )}

      {/* ── Header ── */}
      <div
        className="fade-in"
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "flex-start",
          flexWrap:       "wrap",
          gap:            "16px",
          marginBottom:   "28px",
        }}
      >
        <div>
          <p className="section-label" style={{ marginBottom: "4px" }}>My Pharmacy</p>
          <h1 style={{
            fontSize: "var(--fs-display)", fontWeight: 700,
            color: "var(--clr-on-surface)", letterSpacing: "-0.02em", margin: 0,
          }}>
            Inventory
          </h1>
          <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "4px" }}>
            Track stock levels and expiry status
          </p>
        </div>
        <Link href="/scan" className="btn-secondary" style={{ alignSelf: "flex-start" }}>
          + Add Medicine
        </Link>
      </div>

      {/* ── Filter tabs ── */}
      <div style={{
        display:      "flex",
        gap:          "6px",
        marginBottom: "20px",
        flexWrap:     "wrap",
        borderBottom: "1px solid var(--clr-outline-variant)",
        paddingBottom: "16px",
      }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding:      "6px 14px",
              borderRadius: "var(--r-full)",
              border:       "1px solid",
              borderColor:  filter === f.key ? "var(--clr-secondary)" : "var(--clr-outline-variant)",
              background:   filter === f.key ? "rgba(0,88,190,0.08)" : "transparent",
              color:        filter === f.key ? "var(--clr-secondary)" : "var(--clr-on-surface-variant)",
              fontSize:     "var(--fs-body-sm)",
              fontWeight:   filter === f.key ? 600 : 400,
              cursor:       "pointer",
              transition:   "all 0.15s ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{
          background: "var(--clr-error-container)", color: "var(--clr-error)",
          borderRadius: "var(--r-md)", padding: "14px 18px",
          fontSize: "var(--fs-body-sm)", border: "1px solid rgba(186,26,26,0.2)",
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="card fade-in" style={{ padding: 0, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display:             "grid",
            gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.2fr 1fr",
            padding:             "10px 20px",
            background:          "var(--clr-surface-container-low)",
            borderBottom:        "1px solid var(--clr-outline-variant)",
            gap:                 "12px",
          }}>
            {["Medicine", "Generic", "Stock", "Price", "Expiry", "Status"].map(h => (
              <span key={h} style={{
                fontSize: "var(--fs-label-sm)", fontWeight: 700,
                color: "var(--clr-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.04em",
              }}>{h}</span>
            ))}
          </div>

          {/* Table rows */}
          {filtered.map((item, i) => {
            const expiryDate = new Date(item.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const status     = deriveStatus(item.days_left, item.stock_qty);
            return (
              <div
                key={`${item.medicine_id}-${i}`}
                style={{
                  display:             "grid",
                  gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.2fr 1fr",
                  padding:             "12px 20px",
                  borderBottom:        i < filtered.length - 1 ? "1px solid var(--clr-outline-variant)" : "none",
                  gap:                 "12px",
                  alignItems:          "center",
                  transition:          "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--clr-surface-container-low)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div>
                  <div style={{ fontSize: "var(--fs-body-sm)", fontWeight: 600, color: "var(--clr-on-surface)" }}>{item.brand_name}</div>
                  {item.dosage_form && (
                    <div style={{ fontSize: "var(--fs-label-md)", color: "var(--clr-outline)" }}>{item.dosage_form}</div>
                  )}
                </div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)" }}>{item.generic_name}</div>
                <div style={{
                  fontSize: "var(--fs-body-sm)", fontWeight: 600,
                  color: item.stock_qty < 10 ? "var(--clr-urgent)" : "var(--clr-on-surface)",
                }}>
                  {item.stock_qty} <span style={{ fontWeight: 400, color: "var(--clr-outline)" }}>units</span>
                </div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface)" }}>₹{item.price.toFixed(2)}</div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)" }}>{expiryDate}</div>
                <div><StatusBadge status={status} /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="card fade-in" style={{ textAlign: "center", padding: "64px 32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
          <div style={{ fontSize: "var(--fs-headline)", fontWeight: 600, color: "var(--clr-on-surface)", marginBottom: "8px" }}>
            {filter === "all" ? "No medicines yet" : `No ${filter} medicines`}
          </div>
          <p style={{ fontSize: "var(--fs-body-md)", color: "var(--clr-on-surface-variant)", marginBottom: "24px", maxWidth: "320px", margin: "0 auto 24px" }}>
            {filter === "all"
              ? "Start by adding your first medicine to the inventory."
              : "No medicines match this filter right now."}
          </p>
          {filter === "all" && (
            <Link href="/scan" className="btn-secondary">+ Add First Medicine</Link>
          )}
        </div>
      )}

      {/* Responsive table scroll */}
      <style>{`
        @media (max-width: 768px) {
          .card div[style*="grid-template-columns"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}