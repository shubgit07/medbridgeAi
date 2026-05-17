"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge, { deriveStatus } from "@/components/StatusBadge";
import API from "@/lib/api";

interface InventoryItem {
  medicine_id:   number;
  brand_name:    string;
  generic_name:  string;
  dosage_form?:  string;
  stock_qty:     number;
  expiry_date:   string;
  price:         number;
  days_left:     number;
}

const MOCK_ITEMS: InventoryItem[] = [
  { medicine_id: 1, brand_name: "Crocin 500mg",  generic_name: "Paracetamol",   dosage_form: "Tablet",  stock_qty: 240, expiry_date: "2026-11-15", price: 28.50,  days_left: 182 },
  { medicine_id: 2, brand_name: "Augmentin 625", generic_name: "Amoxicillin",   dosage_form: "Tablet",  stock_qty: 60,  expiry_date: "2025-07-20", price: 185.00, days_left: 64  },
  { medicine_id: 3, brand_name: "Combiflam",     generic_name: "Ibuprofen",     dosage_form: "Tablet",  stock_qty: 8,   expiry_date: "2025-06-10", price: 42.00,  days_left: 24  },
  { medicine_id: 4, brand_name: "Metformin 500", generic_name: "Metformin HCl", dosage_form: "Tablet",  stock_qty: 0,   expiry_date: "2026-03-01", price: 15.00,  days_left: 288 },
  { medicine_id: 5, brand_name: "Allegra 120",   generic_name: "Fexofenadine",  dosage_form: "Tablet",  stock_qty: 150, expiry_date: "2027-01-10", price: 95.00,  days_left: 604 },
  { medicine_id: 6, brand_name: "Azithral 500",  generic_name: "Azithromycin",  dosage_form: "Tablet",  stock_qty: 30,  expiry_date: "2025-05-30", price: 110.00, days_left: 13  },
  { medicine_id: 7, brand_name: "Pantop 40",     generic_name: "Pantoprazole",  dosage_form: "Capsule", stock_qty: 90,  expiry_date: "2026-08-25", price: 65.00,  days_left: 465 },
  { medicine_id: 8, brand_name: "Dolo 650",      generic_name: "Paracetamol",   dosage_form: "Tablet",  stock_qty: 500, expiry_date: "2027-04-01", price: 30.00,  days_left: 684 },
];

type FilterKey = "all" | "stable" | "approaching" | "urgent" | "expired";

export default function InventoryPage() {
  const router = useRouter();
  const [items,   setItems]   = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [isMock,  setIsMock]  = useState(false);
  const [filter,  setFilter]  = useState<FilterKey>("all");

  useEffect(() => {
    const userId = localStorage.getItem("token");
    if (!userId) { router.push("/signin"); return; }
    API.get(`/inventory?user_id=${userId}`)
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => { setItems(MOCK_ITEMS); setIsMock(true); })
      .finally(() => setLoading(false));
  }, [router]);

  const counts = useMemo(() => ({
    all:         items.length,
    stable:      items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "stable").length,
    approaching: items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "approaching").length,
    urgent:      items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "urgent").length,
    expired:     items.filter(i => deriveStatus(i.days_left, i.stock_qty) === "expired").length,
  }), [items]);

  const filtered = useMemo(
    () => filter === "all" ? items : items.filter(i => deriveStatus(i.days_left, i.stock_qty) === filter),
    [items, filter]
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all",         label: `All (${counts.all})`                 },
    { key: "stable",      label: `Stable (${counts.stable})`           },
    { key: "approaching", label: `Approaching (${counts.approaching})` },
    { key: "urgent",      label: `Urgent (${counts.urgent})`           },
    { key: "expired",     label: `Expired (${counts.expired})`         },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", maxWidth: "1440px", margin: "0 auto", padding: "36px 48px", boxSizing: "border-box" }}>

      {isMock && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "var(--r-md)", padding: "10px 16px", marginBottom: "20px", fontSize: "var(--fs-body-sm)", color: "#92400e", display: "flex", gap: "8px" }}>
          <span>⚠️</span>
          <span><strong>Mock data</strong> — Backend not connected. Remove <code>MOCK_ITEMS</code> when live.</span>
        </div>
      )}

      <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <p className="section-label" style={{ marginBottom: "4px" }}>My Pharmacy</p>
          <h1 style={{ fontSize: "var(--fs-display)", fontWeight: 700, color: "var(--clr-on-surface)", letterSpacing: "-0.02em", margin: 0 }}>Inventory</h1>
          <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "4px" }}>Track stock levels and expiry status</p>
        </div>
        <Link href="/scan" className="btn-secondary" style={{ alignSelf: "flex-start" }}>+ Add Medicine</Link>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap", borderBottom: "1px solid var(--clr-outline-variant)", paddingBottom: "16px" }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "6px 14px", borderRadius: "var(--r-full)", border: "1px solid", cursor: "pointer", transition: "all 0.15s ease",
            borderColor: filter === f.key ? "var(--clr-secondary)" : "var(--clr-outline-variant)",
            background:  filter === f.key ? "rgba(0,88,190,0.08)" : "transparent",
            color:       filter === f.key ? "var(--clr-secondary)" : "var(--clr-on-surface-variant)",
            fontSize:    "var(--fs-body-sm)", fontWeight: filter === f.key ? 600 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      {loading && <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>}

      {!loading && error && (
        <div style={{ background: "var(--clr-error-container)", color: "var(--clr-error)", borderRadius: "var(--r-md)", padding: "14px 18px", fontSize: "var(--fs-body-sm)" }}>{error}</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card fade-in" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.2fr 1fr", padding: "10px 20px", gap: "12px", background: "var(--clr-surface-container-low)", borderBottom: "1px solid var(--clr-outline-variant)" }}>
            {["Medicine", "Generic", "Stock", "Price", "Expiry", "Status"].map(h => (
              <span key={h} style={{ fontSize: "var(--fs-label-sm)", fontWeight: 700, color: "var(--clr-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>
          {filtered.map((item, i) => {
            const expiry = new Date(item.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const status = deriveStatus(item.days_left, item.stock_qty);
            return (
              <div key={item.medicine_id} style={{ display: "grid", gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.2fr 1fr", padding: "12px 20px", gap: "12px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid var(--clr-outline-variant)" : "none", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--clr-surface-container-low)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <div>
                  <div style={{ fontSize: "var(--fs-body-sm)", fontWeight: 600, color: "var(--clr-on-surface)" }}>{item.brand_name}</div>
                  {item.dosage_form && <div style={{ fontSize: "var(--fs-label-md)", color: "var(--clr-outline)" }}>{item.dosage_form}</div>}
                </div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)" }}>{item.generic_name}</div>
                <div style={{ fontSize: "var(--fs-body-sm)", fontWeight: 600, color: item.stock_qty < 10 ? "var(--clr-urgent)" : "var(--clr-on-surface)" }}>
                  {item.stock_qty} <span style={{ fontWeight: 400, color: "var(--clr-outline)" }}>units</span>
                </div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface)" }}>₹{item.price.toFixed(2)}</div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)" }}>{expiry}</div>
                <div><StatusBadge status={status} /></div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card fade-in" style={{ textAlign: "center", padding: "64px 32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
          <div style={{ fontSize: "var(--fs-headline)", fontWeight: 600, color: "var(--clr-on-surface)", marginBottom: "8px" }}>
            {filter === "all" ? "No medicines yet" : `No ${filter} medicines`}
          </div>
          <p style={{ fontSize: "var(--fs-body-md)", color: "var(--clr-on-surface-variant)", maxWidth: "320px", margin: "0 auto 24px" }}>
            {filter === "all" ? "Start by adding your first medicine." : "No medicines match this filter."}
          </p>
          {filter === "all" && <Link href="/scan" className="btn-secondary">+ Add First Medicine</Link>}
        </div>
      )}
    </div>
  );
}