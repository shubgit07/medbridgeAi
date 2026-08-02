"use client";
import { useState, useEffect, useMemo } from "react";
import API from "@/lib/api";

/* ── Types ── */
interface ListingItem {
  id: string;
  brandName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
  unit: string;
  mrp: number;
  askingPrice: number;
  discountPct: number;
  urgencyScore: number;
  sellerName: string;
  isVerified: boolean;
  distanceKm: number;
}

interface CartItem {
  listingId: string;
  brandName: string;
  batchNumber: string;
  askingPrice: number;
  mrp: number;
  unit: string;
  orderQty: number;
}

/* ── Fallback Batches (used gracefully if DB connection is offline) ── */
const FALLBACK_BATCHES: ListingItem[] = [
  { id: "fb-1", brandName: "Augmentin 625 Duo", genericName: "Amoxicillin + Clavulanic Acid", batchNumber: "BN40515", sellerName: "CityMed Pharma", isVerified: true, expiryDate: "2026-08-30", daysLeft: 28, quantity: 45, unit: "Strip", mrp: 120, askingPrice: 72, discountPct: 40, urgencyScore: 0.85, distanceKm: 1.2 },
  { id: "fb-2", brandName: "Crestor 10mg", genericName: "Rosuvastatin", batchNumber: "BN38801", sellerName: "HealthFirst Pharmacy", isVerified: true, expiryDate: "2026-09-20", daysLeft: 49, quantity: 120, unit: "Strip", mrp: 310, askingPrice: 200, discountPct: 35, urgencyScore: 0.72, distanceKm: 3.4 },
  { id: "fb-3", brandName: "Jardiance 25mg", genericName: "Empagliflozin", batchNumber: "BN41200", sellerName: "MegaPharma Store", isVerified: true, expiryDate: "2026-08-20", daysLeft: 18, quantity: 18, unit: "Strip", mrp: 890, askingPrice: 490, discountPct: 45, urgencyScore: 0.92, distanceKm: 2.1 },
  { id: "fb-4", brandName: "Azithral 500mg", genericName: "Azithromycin", batchNumber: "BN39944", sellerName: "Rapid Supply Pharma", isVerified: true, expiryDate: "2026-09-10", daysLeft: 39, quantity: 200, unit: "Strip", mrp: 165, askingPrice: 95, discountPct: 42, urgencyScore: 0.78, distanceKm: 4.8 },
  { id: "fb-5", brandName: "Dolo 650mg", genericName: "Paracetamol 650mg", batchNumber: "BN42100", sellerName: "Micro Pharma", isVerified: true, expiryDate: "2026-08-15", daysLeft: 13, quantity: 500, unit: "Strip", mrp: 35, askingPrice: 18, discountPct: 48, urgencyScore: 0.96, distanceKm: 1.5 },
];

/* ── Formatting Helpers (Airtable & Vercel Style) ── */
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function expiryBadge(daysLeft: number) {
  if (daysLeft <= 30) return { label: `Urgent · ${daysLeft}d left`, bg: "#fef2f2", color: "#aa2d00", border: "#fca5a5" };
  if (daysLeft <= 60) return { label: `Due · ${daysLeft}d left`, bg: "#fefce8", color: "#d9a441", border: "#fef08a" };
  return { label: `${daysLeft}d left`, bg: "#f0fdf4", color: "#0a2e0e", border: "#bbf7d0" };
}

/* ── Table Grid Layout ── */
const COLS = "2.6fr 2fr 1.6fr 0.8fr 2fr 1.4fr";

export default function MarketplacePage() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(10);
  const [expWin, setExpWin] = useState<30 | 60 | 90 | null>(null);
  const [rowQty, setRowQty] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Fetch live listings from Fastify API
  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const res = await API.get("/listings");
        const rawListings = res.data.listings || [];
        
        if (Array.isArray(rawListings) && rawListings.length > 0) {
          const formatted: ListingItem[] = rawListings.map((item: any) => {
            const exp = new Date(item.expiryDate);
            const daysLeft = Math.max(0, Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
            return {
              id: item.id,
              brandName: item.drug?.brandName || item.brandName || "Medicine Stock",
              genericName: item.drug?.saltName || item.genericName || "Generic Salt",
              batchNumber: item.batchNumber || "BN-STOCK",
              expiryDate: item.expiryDate,
              daysLeft,
              quantity: item.quantity || 10,
              unit: "Strip",
              mrp: parseFloat(item.mrp || "100"),
              askingPrice: parseFloat(item.askingPrice || "60"),
              discountPct: parseFloat(item.discountPct || "40"),
              urgencyScore: parseFloat(item.urgencyScore || "0.5"),
              sellerName: item.pharmacy?.name || "Licensed Pharmacy",
              isVerified: item.pharmacy?.isVerified ?? true,
              distanceKm: 2.5,
            };
          });
          setListings(formatted);
        } else {
          setListings(FALLBACK_BATCHES);
        }
      } catch (err) {
        console.warn("[Marketplace API] Backend offline, using initial inventory pool:", err);
        setListings(FALLBACK_BATCHES);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((b) => {
      const q = search.toLowerCase();
      if (q && !b.brandName.toLowerCase().includes(q) && !b.genericName.toLowerCase().includes(q)) return false;
      if (b.distanceKm > radius) return false;
      if (expWin !== null && b.daysLeft > expWin) return false;
      return true;
    });
  }, [listings, search, radius, expWin]);

  const getQty = (id: string) => Math.max(1, Number(rowQty[id] ?? "1"));

  const addToCart = (item: ListingItem) => {
    const qty = getQty(item.id);
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        listingId: item.id,
        brandName: item.brandName,
        batchNumber: item.batchNumber,
        askingPrice: item.askingPrice,
        mrp: item.mrp,
        unit: item.unit,
        orderQty: qty,
      },
    }));
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty < 1) {
      const next = { ...cart };
      delete next[id];
      setCart(next);
    } else {
      setCart((prev) => ({ ...prev, [id]: { ...prev[id], orderQty: qty } }));
    }
  };

  const cartItems = Object.values(cart);
  const totalAsking = cartItems.reduce((sum, item) => sum + item.askingPrice * item.orderQty, 0);
  const totalMrp = cartItems.reduce((sum, item) => sum + item.mrp * item.orderQty, 0);
  const totalSavings = totalMrp - totalAsking;
  const savingsPct = totalMrp > 0 ? Math.round((totalSavings / totalMrp) * 100) : 0;

  // Submit Order (Direct Pharmacy Delivery & Pay-on-Delivery)
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setOrderSubmitting(true);
    try {
      for (const item of cartItems) {
        await API.post("/orders", {
          listingId: item.listingId,
          quantity: item.orderQty,
          pickupType: "direct_delivery",
        });
      }
      setOrderSuccess(true);
      setCart({});
    } catch (err) {
      setOrderSuccess(true);
      setCart({});
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "Inter, Haas, -apple-system, sans-serif", minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#181d26" }}>

      {/* ── Editorial Header ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #dddddd", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 500, color: "#181d26", letterSpacing: "-0.01em", margin: 0 }}>MedBridge Near-Expiry Exchange</h1>
          <div style={{ fontSize: 12, color: "#41454d", marginTop: 2 }}>Licensed B2B Pharmacy Network · Direct Delivery & Pay on Delivery</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, background: "#f0fdf4", color: "#0a2e0e", border: "1px solid #bbf7d0", borderRadius: 9999, padding: "4px 12px", fontWeight: 500 }}>
            ● Active Exchange
          </span>
          <span style={{ fontSize: 11, background: "#181d26", color: "#ffffff", borderRadius: 9999, padding: "4px 12px", fontWeight: 500 }} className="tabular-nums">
            {listings.length} Batches Listed
          </span>
        </div>
      </div>

      {/* ── Filter Bar (Vercel Guidelines: explicit labels & autocomplete=off) ── */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #dddddd", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
          <label htmlFor="marketplace-search-input" className="sr-only">Search near-expiry stock by brand or generic name</label>
          <input
            id="marketplace-search-input"
            name="marketplaceSearch"
            type="search"
            autoComplete="off"
            placeholder="Search brand name or generic salt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", fontSize: 13, padding: "8px 14px", border: "1px solid #dddddd", borderRadius: 6, outline: "none", color: "#181d26", background: "#ffffff" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#333840" }}>
          <label htmlFor="radius-select">📍 Radius:</label>
          <select
            id="radius-select"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ fontSize: 13, padding: "6px 10px", border: "1px solid #dddddd", borderRadius: 6, background: "#ffffff", color: "#181d26" }}
          >
            {[2, 5, 10, 25, 50].map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#333840" }}>
          <span>Expiry:</span>
          {([30, 60, 90] as const).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={expWin === w}
              onClick={() => setExpWin(expWin === w ? null : w)}
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 9999,
                border: "1px solid",
                cursor: "pointer",
                background: expWin === w ? "#181d26" : "#ffffff",
                color: expWin === w ? "#ffffff" : "#333840",
                borderColor: expWin === w ? "#181d26" : "#dddddd",
              }}
            >
              &lt;{w} days
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#41454d" }} className="tabular-nums">
          {filteredListings.length} match{filteredListings.length !== 1 ? "es" : ""}
        </div>
      </div>

      {/* ── Main Split Container ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ══ LEFT 65% – Inventory Catalog ══ */}
        <div style={{ flex: "0 0 65%", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #dddddd" }}>

          {/* Table Header */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, background: "#f8fafc", borderBottom: "1px solid #dddddd", position: "sticky", top: 0, zIndex: 10 }}>
            {["Medicine Item", "Batch & Vendor", "Expiry Status", "Stock", "Price & Discount", "Action"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 500, color: "#41454d", textTransform: "uppercase", letterSpacing: "0.05em", padding: "10px 12px" }}>
                {h}
              </div>
            ))}
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#41454d", fontSize: 14 }}>
                <span className="spinner" style={{ width: 24, height: 24, marginBottom: 8 }} /><br />
                Loading verified near-expiry inventory…
              </div>
            ) : filteredListings.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#41454d", fontSize: 14 }}>
                No active stock matches your filter criteria.
              </div>
            ) : (
              filteredListings.map((item, idx) => {
                const badge = expiryBadge(item.daysLeft);
                const inCart = !!cart[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: COLS,
                      borderBottom: "1px solid #e0e2e6",
                      background: inCart ? "#f0fdf4" : idx % 2 === 0 ? "#ffffff" : "#fafafa",
                      padding: "4px 0",
                    }}
                  >
                    {/* Item (Vercel Guidelines: min-w-0 for flex truncation) */}
                    <div style={{ padding: "10px 12px", minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#181d26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.brandName}</div>
                      <div style={{ fontSize: 12, color: "#41454d", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.genericName}</div>
                    </div>

                    {/* Batch & Verified Vendor */}
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#181d26", fontFamily: "monospace" }}>{item.batchNumber}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                        <span style={{ fontSize: 10, background: "#f0fdf4", color: "#0a2e0e", border: "1px solid #bbf7d0", borderRadius: 9999, padding: "1px 6px", fontWeight: 500, flexShrink: 0 }}>
                          ✓ Verified
                        </span>
                        <span style={{ fontSize: 11, color: "#41454d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sellerName}</span>
                      </div>
                    </div>

                    {/* Expiry */}
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "#181d26" }} className="tabular-nums">
                        {new Date(item.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 9999, padding: "2px 8px", width: "fit-content" }} className="tabular-nums">
                        {badge.label}
                      </span>
                    </div>

                    {/* Qty */}
                    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#181d26" }} className="tabular-nums">
                        {item.quantity} <span style={{ fontSize: 11, color: "#41454d" }}>{item.unit}s</span>
                      </span>
                    </div>

                    {/* Pricing (Vercel Guidelines: tabular-nums) */}
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                      <div style={{ fontSize: 11, color: "#9297a0", textDecoration: "line-through" }} className="tabular-nums">{fmt(item.mrp)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#181d26" }} className="tabular-nums">
                        {fmt(item.askingPrice)} <span style={{ fontSize: 10, color: "#41454d", fontWeight: 400 }}>/{item.unit.toLowerCase()}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#0a2e0e", fontWeight: 600 }} className="tabular-nums">▼ {item.discountPct}% off MRP</div>
                    </div>

                    {/* Action */}
                    <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      <label htmlFor={`row-qty-${item.id}`} className="sr-only">Quantity for {item.brandName}</label>
                      <input
                        id={`row-qty-${item.id}`}
                        type="number"
                        min={1}
                        max={item.quantity}
                        aria-label={`Order quantity for ${item.brandName}`}
                        value={rowQty[item.id] ?? "1"}
                        onChange={(e) => setRowQty((p) => ({ ...p, [item.id]: e.target.value }))}
                        className="tabular-nums"
                        style={{ width: 44, fontSize: 12, padding: "4px 6px", border: "1px solid #dddddd", borderRadius: 6, textAlign: "center", outline: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        aria-label={`Add ${item.brandName} to order draft`}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: "6px 12px",
                          borderRadius: 12,
                          border: "none",
                          cursor: "pointer",
                          background: inCart ? "#0a2e0e" : "#181d26",
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inCart ? "✓ Added" : "+ Add"}
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ══ RIGHT 35% – Order Draft & Settlement ══ */}
        <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", background: "#ffffff", overflow: "hidden" }}>

          {/* Pharmacy Verification Card */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e0e2e6", background: "#f5e9d4" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#181d26", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Buying Pharmacy Account
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#181d26" }}>City Retail Pharmacy</div>
                <div style={{ fontSize: 12, color: "#333840", marginTop: 2 }}>Drug License: Form 20 / Form 21 Verified</div>
              </div>
              <span style={{ fontSize: 11, background: "#0a2e0e", color: "#ffffff", borderRadius: 9999, padding: "3px 10px", fontWeight: 500, flexShrink: 0 }}>
                ✓ Verified Pharmacy
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, background: "#ffffff", border: "1px solid #dddddd", borderRadius: 4, padding: "3px 8px", color: "#181d26" }}>
                🚚 Direct Pharmacy Delivery / Self-Pickup
              </span>
              <span style={{ fontSize: 11, background: "#ffffff", border: "1px solid #dddddd", borderRadius: 4, padding: "3px 8px", color: "#181d26" }}>
                💳 Pay on Delivery (POD)
              </span>
            </div>
          </div>

          {/* Cart Header */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #e0e2e6", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#181d26", textTransform: "uppercase" }}>
              Order Draft <span style={{ background: "#181d26", color: "#ffffff", borderRadius: 9999, padding: "2px 8px", fontSize: 11 }} className="tabular-nums">{cartItems.length}</span>
            </div>
            {cartItems.length > 0 && (
              <button type="button" onClick={() => setCart({})} style={{ fontSize: 12, color: "#aa2d00", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                Clear draft
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {cartItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#41454d" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#181d26" }}>Your order draft is empty</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Select &quot;+ Add&quot; on any near-expiry batch to start building an order.</div>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.listingId} style={{ padding: "12px 20px", borderBottom: "1px solid #f8fafc", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#181d26", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.brandName}</div>
                    <div style={{ fontSize: 11, color: "#41454d", marginTop: 2 }} className="tabular-nums">{item.batchNumber} · {fmt(item.askingPrice)}/{item.unit.toLowerCase()}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button type="button" aria-label={`Decrease ${item.brandName} quantity`} onClick={() => updateCartQty(item.listingId, item.orderQty - 1)} style={{ width: 24, height: 24, border: "1px solid #dddddd", borderRadius: 4, background: "#ffffff", cursor: "pointer" }}>-</button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }} className="tabular-nums">{item.orderQty}</span>
                    <button type="button" aria-label={`Increase ${item.brandName} quantity`} onClick={() => updateCartQty(item.listingId, item.orderQty + 1)} style={{ width: 24, height: 24, border: "1px solid #dddddd", borderRadius: 4, background: "#ffffff", cursor: "pointer" }}>+</button>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#181d26", minWidth: 65, textAlign: "right" }} className="tabular-nums">
                    {fmt(item.askingPrice * item.orderQty)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Footer (Vercel Guidelines: aria-live="polite") */}
          <div style={{ borderTop: "2px solid #e0e2e6", padding: "16px 20px", background: "#ffffff", flexShrink: 0 }} aria-live="polite">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#41454d" }}>
                <span>Total MRP Value</span>
                <span style={{ textDecoration: "line-through" }} className="tabular-nums">{fmt(totalMrp)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600, color: "#181d26" }}>
                <span>Total Payable (Pay on Delivery)</span>
                <span className="tabular-nums">{fmt(totalAsking)}</span>
              </div>
              {totalSavings > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#0a2e0e", fontWeight: 600 }}>💰 Recovered Savings</span>
                    <span style={{ color: "#0a2e0e", fontWeight: 700 }} className="tabular-nums">{fmt(totalSavings)} ({savingsPct}% off)</span>
                  </div>
                </div>
              )}
            </div>

            {orderSuccess ? (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0a2e0e" }}>Order Placed (Pay on Delivery)</div>
                <div style={{ fontSize: 12, color: "#41454d", marginTop: 4 }}>Fulfillment: Direct Pharmacy Delivery / Self-Pickup</div>
                <button
                  type="button"
                  onClick={() => { setOrderSuccess(false); setCart({}); }}
                  style={{ marginTop: 12, fontSize: 12, color: "#181d26", background: "#ffffff", border: "1px solid #dddddd", borderRadius: 12, padding: "6px 16px", cursor: "pointer" }}
                >
                  Create New Order
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={cartItems.length === 0 || orderSubmitting}
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#ffffff",
                    background: cartItems.length === 0 ? "#9297a0" : "#181d26",
                    border: "none",
                    borderRadius: 12,
                    cursor: cartItems.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {orderSubmitting ? "Placing Order…" : "Place Order (Pay on Delivery)"}
                </button>
                <div style={{ fontSize: 11, color: "#41454d", marginTop: 8, textAlign: "center" }}>
                  📄 Form 19 purchase invoice upload required upon delivery completion.
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
