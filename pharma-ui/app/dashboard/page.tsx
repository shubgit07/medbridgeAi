"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ACTION_CARDS = [
  {
    id:          "dashboard-search-card",
    href:        "/search",
    icon:        "🔍",
    title:       "Search Medicines",
    description: "Look up medicines across the entire inventory database",
    cta:         "Search now",
    accent:      "var(--clr-info-bg)",
    accentText:  "var(--clr-info)",
  },
  {
    id:          "dashboard-inventory-card",
    href:        "/inventory",
    icon:        "📦",
    title:       "My Inventory",
    description: "View and manage your pharmacy's stock and expiry dates",
    cta:         "Open inventory",
    accent:      "var(--clr-stable-bg)",
    accentText:  "var(--clr-stable)",
  },
  {
    id:          "dashboard-scan-card",
    href:        "/scan",
    icon:        "➕",
    title:       "Add Medicine",
    description: "Scan a label with OCR or enter medicine details manually",
    cta:         "Add now",
    accent:      "var(--clr-approaching-bg)",
    accentText:  "var(--clr-approaching)",
  },
];

export default function Dashboard() {
  const router  = useRouter();
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState("Pharmacy");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
    } else {
      const stored = localStorage.getItem("pharmacy_name");
      if (stored) setName(stored);
      setLoading(false);
    }
  }, [router]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "36px 48px", boxSizing: "border-box" }}>

      {/* ── Page header ── */}
      <div
        className="fade-in"
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "flex-start",
          flexWrap:       "wrap",
          gap:            "16px",
          marginBottom:   "36px",
        }}
      >
        <div>
          <p className="section-label" style={{ marginBottom: "4px" }}>Dashboard</p>
          <h1 style={{
            fontSize: "var(--fs-display)", fontWeight: 700,
            color: "var(--clr-on-surface)", letterSpacing: "-0.02em",
            margin: 0,
          }}>
            Good day, {name} 👋
          </h1>
          <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "4px" }}>
            {today}
          </p>
        </div>

        <Link
          id="dashboard-add-btn"
          href="/scan"
          className="btn-secondary"
          style={{ alignSelf: "flex-start" }}
        >
          + Add Medicine
        </Link>
      </div>

      {/* ── Quick-stats row (placeholder) ── */}
      <div
        className="fade-in"
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap:                 "16px",
          marginBottom:        "40px",
        }}
      >
        {[
          { label: "Total Medicines", value: "—", sub: "in your inventory", color: "var(--clr-secondary)" },
          { label: "Expiring Soon",   value: "—", sub: "within 30 days",    color: "var(--clr-urgent)"    },
          { label: "Low Stock",       value: "—", sub: "under 10 units",     color: "var(--clr-approaching)" },
        ].map(stat => (
          <div
            key={stat.label}
            className="card"
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span style={{ fontSize: "var(--fs-label-md)", color: "var(--clr-on-surface-variant)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {stat.label}
            </span>
            <span style={{ fontSize: "28px", fontWeight: 700, color: stat.color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {stat.value}
            </span>
            <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-outline)" }}>
              {stat.sub}
            </span>
          </div>
        ))}
      </div>

      {/* ── Action cards ── */}
      <p className="section-label">Quick Actions</p>
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap:                 "20px",
        }}
      >
        {ACTION_CARDS.map((card, i) => (
          <div
            key={card.id}
            id={card.id}
            className="card fade-in"
            style={{
              display:        "flex",
              flexDirection:  "column",
              gap:            "12px",
              animationDelay: `${i * 60}ms`,
              transition:     "box-shadow 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-elevated)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)";
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
            }}
          >
            <div
              style={{
                width:        "44px",
                height:       "44px",
                borderRadius: "var(--r-lg)",
                background:   card.accent,
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontSize:     "22px",
              }}
            >
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: "var(--fs-headline)", fontWeight: 700, color: "var(--clr-on-surface)", marginBottom: "4px" }}>
                {card.title}
              </div>
              <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", lineHeight: 1.5 }}>
                {card.description}
              </div>
            </div>
            <Link
              href={card.href}
              style={{
                marginTop:     "auto",
                display:       "inline-flex",
                alignItems:    "center",
                gap:           "6px",
                fontSize:      "var(--fs-body-sm)",
                fontWeight:    600,
                color:         card.accentText,
                textDecoration: "none",
              }}
            >
              {card.cta} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}