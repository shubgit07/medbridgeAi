"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "@/lib/api";

const ACTION_CARDS = [
  {
    id: "dashboard-marketplace-card",
    href: "/marketplace",
    icon: "🏬",
    title: "Near-Expiry Marketplace",
    description: "Browse nearby pharmacy listings and buy or trade near-expiry stock",
    cta: "Explore Marketplace",
    bg: "#ffffff",
    badge: "Live Exchange",
  },
  {
    id: "dashboard-search-card",
    href: "/search",
    icon: "🔍",
    title: "Medicine Search Engine",
    description: "Search medicines across generic salt names and brand catalogs",
    cta: "Search catalog",
    bg: "#ffffff",
    badge: "FTS + Fuzzy",
  },
  {
    id: "dashboard-scan-card",
    href: "/scan",
    icon: "📸",
    title: "AI Label OCR Scanner",
    description: "Scan medicine box labels with AI to extract batch and expiry details",
    cta: "Scan Box Now",
    bg: "#f5e9d4", // Signature cream callout
    badge: "Gemini Vision AI",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("City Pharmacy");
  const [stats, setStats] = useState({ total: 12, urgent: 3, lowStock: 2 });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
    } else {
      const stored = localStorage.getItem("pharmacy_name");
      if (stored) setName(stored);

      // Fetch real inventory count if available
      API.get("/inventory")
        .then((res) => {
          if (Array.isArray(res.data)) {
            const urgentCount = res.data.filter((i: any) => i.days_left <= 30).length;
            setStats({
              total: res.data.length,
              urgent: urgentCount,
              lowStock: res.data.filter((i: any) => i.stock_qty <= 10).length,
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [router]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
      
      {/* ── Airtable Page Header Band ── */}
      <div
        className="fade-in"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "32px",
          borderBottom: "1px solid #dddddd",
          paddingBottom: "24px",
        }}
      >
        <div>
          <p className="section-label" style={{ marginBottom: "4px" }}>Pharmacy Operations Dashboard</p>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 500,
              color: "#181d26",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Welcome, {name}
          </h1>
          <p style={{ fontSize: "14px", color: "#41454d", marginTop: "4px" }}>
            {today} · Licensed B2B Expiry Management
          </p>
        </div>

        <Link
          id="dashboard-add-btn"
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

      {/* ── Quick Stats Band ── */}
      <div
        className="fade-in"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        {[
          { label: "Active Inventory Batches", value: stats.total, sub: "Registered in catalog", color: "#181d26", bg: "#ffffff" },
          { label: "Near-Expiry Alert Stock", value: stats.urgent, sub: "Expires within 30 days", color: "#aa2d00", bg: "#fef2f2" },
          { label: "Low Stock Units", value: stats.lowStock, sub: "Under 10 units left", color: "#d9a441", bg: "#fefce8" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: stat.bg,
              border: "1px solid #dddddd",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#41454d", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {stat.label}
            </span>
            <span style={{ fontSize: "36px", fontWeight: 500, color: stat.color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {stat.value}
            </span>
            <span style={{ fontSize: "13px", color: "#41454d" }}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Action Cards Grid ── */}
      <p className="section-label" style={{ marginBottom: "16px" }}>Management Actions</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {ACTION_CARDS.map((card, i) => (
          <div
            key={card.id}
            id={card.id}
            className="fade-in"
            style={{
              background: card.bg,
              border: "1px solid #dddddd",
              borderRadius: "12px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px",
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "28px" }}>{card.icon}</span>
                <span style={{ fontSize: "11px", background: "#ffffff", border: "1px solid #dddddd", borderRadius: 9999, padding: "3px 10px", fontWeight: 500, color: "#181d26" }}>
                  {card.badge}
                </span>
              </div>
              <div style={{ fontSize: "18px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
                {card.title}
              </div>
              <div style={{ fontSize: "14px", color: "#41454d", lineHeight: 1.4 }}>
                {card.description}
              </div>
            </div>
            <Link
              href={card.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#181d26",
                textDecoration: "none",
                marginTop: "12px",
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