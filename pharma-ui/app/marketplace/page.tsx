"use client";
import { useState, useMemo } from "react";

/* ── Types ── */
interface Batch {
  id: string; brand: string; generic: string; batchNo: string;
  vendorScore: number; vendorName: string; expiry: string;
  daysLeft: number; qty: number; unit: string; mrp: number;
  askPrice: number; distance: number;
}
interface CartItem {
  batchId: string; brand: string; batchNo: string;
  askPrice: number; mrp: number; unit: string; orderQty: number;
}

/* ── Static data ── */
const BATCHES: Batch[] = [
  { id:"1",  brand:"Augmentin 625 Duo",  generic:"Amoxicillin + Clavulanic Acid",    batchNo:"#B40515", vendorScore:0.95, vendorName:"CityMed Pharma",    expiry:"2025-06-15", daysLeft:29,  qty:45,  unit:"Strip", mrp:120,  askPrice:72,   distance:1.2 },
  { id:"2",  brand:"Crestor 10mg",        generic:"Rosuvastatin",                      batchNo:"#B38801", vendorScore:0.88, vendorName:"HealthFirst Dist.", expiry:"2025-07-20", daysLeft:64,  qty:120, unit:"Strip", mrp:310,  askPrice:200,  distance:3.4 },
  { id:"3",  brand:"Jardiance 25",        generic:"Empagliflozin",                     batchNo:"#B41200", vendorScore:0.92, vendorName:"MegaPharma Ltd.",   expiry:"2025-06-08", daysLeft:22,  qty:18,  unit:"Strip", mrp:890,  askPrice:490,  distance:2.1 },
  { id:"4",  brand:"Azithral 500",        generic:"Azithromycin",                      batchNo:"#B39944", vendorScore:0.79, vendorName:"Rapid Supply Co.",  expiry:"2025-07-05", daysLeft:49,  qty:200, unit:"Strip", mrp:165,  askPrice:95,   distance:4.8 },
  { id:"5",  brand:"Lantus SoloStar",     generic:"Insulin Glargine",                  batchNo:"#B40010", vendorScore:0.97, vendorName:"DiaCare Pharma",    expiry:"2025-06-20", daysLeft:34,  qty:15,  unit:"Vial",  mrp:1850, askPrice:1100, distance:0.8 },
  { id:"6",  brand:"Pantop D 40",         generic:"Pantoprazole + Domperidone",        batchNo:"#B41555", vendorScore:0.85, vendorName:"MedPlus Dist.",     expiry:"2025-08-01", daysLeft:76,  qty:350, unit:"Strip", mrp:145,  askPrice:88,   distance:5.0 },
  { id:"7",  brand:"Dolo 650",            generic:"Paracetamol 650mg",                 batchNo:"#B42100", vendorScore:0.91, vendorName:"Micro Labs",        expiry:"2025-06-02", daysLeft:16,  qty:500, unit:"Strip", mrp:35,   askPrice:18,   distance:1.5 },
  { id:"8",  brand:"Allegra 120mg",       generic:"Fexofenadine HCl",                  batchNo:"#B39012", vendorScore:0.83, vendorName:"Sanofi Direct",     expiry:"2025-07-15", daysLeft:59,  qty:80,  unit:"Strip", mrp:198,  askPrice:120,  distance:3.0 },
  { id:"9",  brand:"Metformin 500 SR",    generic:"Metformin HCl",                     batchNo:"#B40388", vendorScore:0.90, vendorName:"Sun Pharma Dist.",  expiry:"2025-07-28", daysLeft:72,  qty:600, unit:"Strip", mrp:28,   askPrice:16,   distance:2.7 },
  { id:"10", brand:"Telma H 40",          generic:"Telmisartan + Hydrochlorothiazide", batchNo:"#B41100", vendorScore:0.87, vendorName:"Glenmark Direct",   expiry:"2025-06-25", daysLeft:39,  qty:75,  unit:"Strip", mrp:210,  askPrice:130,  distance:3.9 },
];

/* ── Helpers ── */
const pct  = (mrp: number, ask: number) => Math.round(((mrp - ask) / mrp) * 100);
const fmt  = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sclr = (s: number) => s >= 0.9 ? "#15803d" : s >= 0.8 ? "#b45309" : "#c2410c";

function expiryBadge(d: number) {
  if (d < 30) return { label: `Urgent · ${d}d`, bg: "#fff1eb", color: "#c2410c", border: "#fca983" };
  if (d < 60) return { label: `Due · ${d}d`,    bg: "#fffbe6", color: "#b45309", border: "#fde68a" };
  return          { label: `${d}d left`,         bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
}

/* ── Column grid ── */
const COLS = "2.8fr 2fr 1.6fr 0.8fr 2fr 1.4fr";

/* ── Sub-components ── */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", padding: "7px 10px" }}>
      {children}
    </div>
  );
}

function Pill({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: bg, color, border: `1px solid ${border}`, borderRadius: 9999, padding: "2px 8px", display: "inline-block", whiteSpace: "nowrap", lineHeight: 1.6 }}>
      {label}
    </span>
  );
}

/* ── Main Page ── */
export default function MarketplacePage() {
  const [search,  setSearch]  = useState("");
  const [radius,  setRadius]  = useState(5);
  const [expWin,  setExpWin]  = useState<30 | 60 | 90 | null>(null);
  const [rowQty,  setRowQty]  = useState<Record<string, string>>({});
  const [cart,    setCart]    = useState<Record<string, CartItem>>({});
  const [done,    setDone]    = useState(false);

  const batches = useMemo(() =>
    BATCHES.filter(b => {
      const q = search.toLowerCase();
      if (q && !b.brand.toLowerCase().includes(q) && !b.generic.toLowerCase().includes(q)) return false;
      if (b.distance > radius) return false;
      if (expWin !== null && b.daysLeft > expWin) return false;
      return true;
    }),
    [search, radius, expWin]
  );

  const gq  = (id: string) => Math.max(1, Number(rowQty[id] ?? "1"));
  const add  = (b: Batch)  => setCart(p => ({ ...p, [b.id]: { batchId: b.id, brand: b.brand, batchNo: b.batchNo, askPrice: b.askPrice, mrp: b.mrp, unit: b.unit, orderQty: gq(b.id) } }));
  const upd  = (id: string, v: number) => {
    if (v < 1) { const n = { ...cart }; delete n[id]; setCart(n); }
    else setCart(p => ({ ...p, [id]: { ...p[id], orderQty: v } }));
  };

  const items    = Object.values(cart);
  const totAsk   = items.reduce((s, i) => s + i.askPrice * i.orderQty, 0);
  const totMrp   = items.reduce((s, i) => s + i.mrp * i.orderQty, 0);
  const saved    = totMrp - totAsk;
  const savePct  = totMrp > 0 ? Math.round((saved / totMrp) * 100) : 0;

  const base: React.CSSProperties = { fontFamily: "var(--font-geist-sans, Inter, system-ui, sans-serif)" };

  return (
    <div style={{ ...base, height: "calc(100vh - 56px)", display: "flex", flexDirection: "column", background: "#f8fafc" }}>

      {/* ── Page header bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>MedBridge Marketplace</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Licensed B2B near-expiry exchange · Secure Escrow Protected</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 11, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 9999, padding: "3px 10px", fontWeight: 600 }}>● Live</span>
          <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 9999, padding: "3px 10px", fontWeight: 600 }}>{BATCHES.length} Batches</span>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "7px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
        <input
          placeholder="Search by brand name or salt..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, maxWidth: 300, fontSize: 12, padding: "6px 11px", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none", color: "#0f172a", background: "#f8fafc" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
          <span>📍</span>
          <select value={radius} onChange={e => setRadius(Number(e.target.value))}
            style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#f8fafc", color: "#0f172a" }}>
            {[2, 5, 10, 25, 50].map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
          <span>Expiry:</span>
          {([30, 60, 90] as const).map(w => (
            <button key={w} onClick={() => setExpWin(expWin === w ? null : w)}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 9999, border: "1px solid", cursor: "pointer",
                background: expWin === w ? "#0f172a" : "transparent",
                color: expWin === w ? "#fff" : "#475569",
                borderColor: expWin === w ? "#0f172a" : "#cbd5e1" }}>
              &lt;{w}d
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>{batches.length} batch{batches.length !== 1 ? "es" : ""} found</div>
      </div>

      {/* ── Split body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ══ LEFT 65% – Catalog ══ */}
        <div style={{ flex: "0 0 65%", display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid #e2e8f0" }}>

          {/* Table head */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
            {["Item Details", "Batch & Vendor", "Expiry", "Qty", "Pricing", "Action"].map(h => <Th key={h}>{h}</Th>)}
          </div>

          {/* Table rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {batches.length === 0
              ? <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No batches match your filters.</div>
              : batches.map((b, i) => {
                const bg = expiryBadge(b.daysLeft);
                const disc = pct(b.mrp, b.askPrice);
                const inCart = !!cart[b.id];
                return (
                  <div key={b.id} style={{ display: "grid", gridTemplateColumns: COLS, borderBottom: "1px solid #f1f5f9", background: inCart ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.1s" }}>

                    {/* 1 Item */}
                    <div style={{ padding: "9px 10px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>{b.brand}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{b.generic}</div>
                    </div>

                    {/* 2 Batch & Vendor */}
                    <div style={{ padding: "9px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", fontFamily: "monospace" }}>{b.batchNo}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, color: sclr(b.vendorScore), fontWeight: 700 }}>★ {b.vendorScore.toFixed(2)}</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>· {b.vendorName}</span>
                      </div>
                    </div>

                    {/* 3 Expiry */}
                    <div style={{ padding: "9px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {new Date(b.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                      <Pill {...bg} />
                    </div>

                    {/* 4 Qty */}
                    <div style={{ padding: "9px 10px", display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                        {b.qty} <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>{b.unit}s</span>
                      </span>
                    </div>

                    {/* 5 Pricing */}
                    <div style={{ padding: "9px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>{fmt(b.mrp)}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                        {fmt(b.askPrice)}<span style={{ fontSize: 10, fontWeight: 400, color: "#64748b" }}>/{b.unit.toLowerCase()}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>▼ {disc}% off MRP</div>
                    </div>

                    {/* 6 Action */}
                    <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                      <input
                        type="number" min={1} max={b.qty}
                        value={rowQty[b.id] ?? "1"}
                        onChange={e => setRowQty(p => ({ ...p, [b.id]: e.target.value }))}
                        style={{ width: 42, fontSize: 12, padding: "5px 4px", border: "1px solid #e2e8f0", borderRadius: 5, textAlign: "center", outline: "none", background: "#f8fafc" }}
                      />
                      <button onClick={() => add(b)}
                        style={{ fontSize: 11, fontWeight: 600, padding: "5px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                          background: inCart ? "#16a34a" : "#0f172a", color: "#fff", transition: "background 0.15s", whiteSpace: "nowrap" }}>
                        {inCart ? "✓ Added" : "+ Add"}
                      </button>
                    </div>

                  </div>
                );
              })}
          </div>
        </div>

        {/* ══ RIGHT 35% – Order Builder ══ */}
        <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>

          {/* Buyer compliance card */}
          <div style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>Buyer Account</div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Apex Pharmacy Pvt. Ltd.</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Drug Lic: GJ-DL-20/21-2024-0041892</div>
              </div>
              <span style={{ fontSize: 11, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 9999, padding: "3px 10px", fontWeight: 700, flexShrink: 0 }}>✓ Verified</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              {["Form 20 ✓", "Form 21 ✓", "GST Active"].map(t => (
                <span key={t} style={{ fontSize: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px", color: "#475569", fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Cart header */}
          <div style={{ padding: "9px 16px 6px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Order Draft{" "}
              <span style={{ background: "#0f172a", color: "#fff", borderRadius: 9999, padding: "1px 7px", fontSize: 10 }}>{items.length}</span>
            </div>
            {items.length > 0 && (
              <button onClick={() => setCart({})} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear all</button>
            )}
          </div>

          {/* Cart items – scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 0 4px" }}>
            {items.length === 0
              ? (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>🛒</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>No items added yet.</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 3 }}>Click &quot;+ Add&quot; on any row to begin.</div>
                </div>
              )
              : items.map(item => (
                <div key={item.batchId} style={{ padding: "9px 16px", borderBottom: "1px solid #f8fafc", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.brand}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{item.batchNo} · {fmt(item.askPrice)}/{item.unit.toLowerCase()}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", textDecoration: "line-through" }}>MRP {fmt(item.mrp)}/{item.unit.toLowerCase()}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <button onClick={() => upd(item.batchId, item.orderQty - 1)}
                        style={{ width: 20, height: 20, border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>−</button>
                      <input type="number" min={1} value={item.orderQty}
                        onChange={e => upd(item.batchId, Number(e.target.value))}
                        style={{ width: 36, textAlign: "center", fontSize: 12, fontWeight: 700, border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 4px", outline: "none" }} />
                      <button onClick={() => upd(item.batchId, item.orderQty + 1)}
                        style={{ width: 20, height: 20, border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>+</button>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{fmt(item.askPrice * item.orderQty)}</div>
                  </div>
                </div>
              ))}
          </div>

          {/* ── Checkout panel ── */}
          <div style={{ borderTop: "2px solid #f1f5f9", padding: "13px 16px", flexShrink: 0, background: "#fff" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                <span>Total MRP Value</span>
                <span style={{ textDecoration: "line-through" }}>{fmt(totMrp)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                <span>Order Total</span>
                <span>{fmt(totAsk)}</span>
              </div>
              {saved > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 12px", marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>💰 Net Savings vs MRP</span>
                    <span style={{ color: "#15803d", fontWeight: 800 }}>{fmt(saved)}</span>
                  </div>
                  <div style={{ marginTop: 5, height: 4, borderRadius: 9999, background: "#dcfce7", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(savePct, 100)}%`, background: "#16a34a", borderRadius: 9999, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#15803d", marginTop: 3, textAlign: "right", fontWeight: 600 }}>{savePct}% avg margin saved</div>
                </div>
              )}
            </div>

            {done
              ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>Escrow Order Initialized</div>
                  <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>Ref: ESC-{Date.now().toString().slice(-8)}</div>
                  <button onClick={() => { setDone(false); setCart({}); }}
                    style={{ marginTop: 10, fontSize: 11, color: "#64748b", background: "none", border: "1px solid #e2e8f0", borderRadius: 5, padding: "4px 12px", cursor: "pointer" }}>
                    Start New Order
                  </button>
                </div>
              )
              : (
                <>
                  <button
                    id="btn-escrow-order"
                    onClick={() => { if (items.length > 0) setDone(true); }}
                    disabled={items.length === 0}
                    style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 700, color: "#fff",
                      background: items.length === 0 ? "#94a3b8" : "#0f172a",
                      border: "none", borderRadius: 8, cursor: items.length === 0 ? "not-allowed" : "pointer",
                      letterSpacing: "-0.01em", transition: "background 0.2s" }}>
                    🔒 Initialize Secure Escrow Order
                  </button>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 7, lineHeight: 1.55, textAlign: "center" }}>
                    ⚠️ <em>Form 19 purchase invoice upload will be strictly required upon transit completion to release escrow funds.</em>
                  </div>
                </>
              )}
          </div>

        </div>
      </div>
    </div>
  );
}
