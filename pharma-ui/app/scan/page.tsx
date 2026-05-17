"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import API from "@/lib/api";

// Lazy-load heavy libs – not needed at startup (prevents slow initial compile)
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), {
  ssr: false,
  loading: () => <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading camera…</div>,
});

// Tesseract is loaded on-demand inside handleOCR, not as a top-level import
async function runOCR(file: File): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: any) => console.log("OCR:", m),
  });
  return result.data.text;
}


function StepIndicator({ current }: { current: number }) {
  const steps = ["Choose", "Details", "Submit"];
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "28px" }}>
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: done ? "var(--clr-stable)" : active ? "var(--clr-secondary)" : "var(--clr-surface-container)",
                color: done || active ? "#fff" : "var(--clr-outline)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700,
                border: active ? "2px solid var(--clr-secondary)" : "2px solid transparent",
                boxShadow: active ? "0 0 0 3px rgba(0,88,190,0.15)" : "none",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "var(--fs-label-sm)",
                color: active ? "var(--clr-secondary)" : done ? "var(--clr-on-surface-variant)" : "var(--clr-outline)",
                fontWeight: active ? 600 : 400, whiteSpace: "nowrap",
              }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: "2px",
                background: done ? "var(--clr-stable)" : "var(--clr-outline-variant)",
                margin: "0 6px", marginBottom: "20px",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InputRow({ label, name, type = "text", placeholder = "", value, onChange }: any) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--clr-on-surface)", marginBottom: "6px" }}>
        {label}
      </label>
      <input name={name} type={type} placeholder={placeholder} value={value} onChange={onChange} className="input-field" />
    </div>
  );
}

export default function ScanPage() {
  const [step, setStep]               = useState(0);
  const [showQR, setShowQR]           = useState(false);
  const [ocrLoading, setOcrLoading]   = useState(false);
  const [terms, setTerms]             = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form, setForm] = useState({
    brand_name: "", generic_name: "", dosage_form: "",
    manufacturer: "", stock_qty: "", expiry_date: "", price: "",
  });

  const handleQR = (err: any, result: any) => { if (result) console.log("QR:", result.text); };

  const handleOCR = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const text = await runOCR(file);
      if (!text || text.trim() === "") { alert("No text detected."); return; }
      const response = await fetch("http://localhost:8000/extract-medicine", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setForm(prev => ({ ...prev, ...data.data }));
      setStep(1);
    } catch (err) { console.error(err); alert("OCR failed."); }
    finally { setOcrLoading(false); }
  };

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!terms) return alert("Accept the terms first.");
    setSubmitLoading(true);
    try {
      await API.post("/insert-full", {
        ...form, stock_qty: Number(form.stock_qty), price: Number(form.price),
        user_id: localStorage.getItem("token"),
      });
      window.location.href = "/dashboard";
    } catch (err) { console.error(err); alert("Failed to add."); }
    finally { setSubmitLoading(false); }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px var(--sp-container)", background: "var(--clr-bg)" }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: "900px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "var(--fs-headline)", fontWeight: 700, color: "var(--clr-on-surface)", margin: 0 }}>Add Medicine</h1>
          <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "4px" }}>
            Scan a label or fill in details manually
          </p>
        </div>

        <StepIndicator current={showQR ? 0 : step} />

        {/* STEP 0: Choose */}
        {step === 0 && !showQR && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }} className="fade-in">
            <label htmlFor="ocr-upload" style={{
              display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px",
              border: "1px dashed var(--clr-outline-variant)", borderRadius: "var(--r-lg)",
              cursor: ocrLoading ? "not-allowed" : "pointer", background: "var(--clr-surface-container-low)",
              transition: "border-color 0.15s, background 0.15s", opacity: ocrLoading ? 0.7 : 1,
            }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "var(--r-lg)", background: "var(--clr-info-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                {ocrLoading ? <span className="spinner" /> : "📸"}
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-body-md)", fontWeight: 600, color: "var(--clr-on-surface)" }}>{ocrLoading ? "Extracting text…" : "Upload Label Image"}</div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "2px" }}>OCR + AI extracts medicine details automatically</div>
              </div>
              <input id="ocr-upload" type="file" accept="image/*" style={{ display: "none" }}
                onClick={(e: any) => (e.target.value = null)}
                onChange={e => { console.log("🔥 FILE CHANGE TRIGGERED"); handleOCR(e); }}
                disabled={ocrLoading} />
            </label>

            <button id="scan-qr-btn" onClick={() => setShowQR(true)} style={{
              display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px",
              border: "1px solid var(--clr-outline-variant)", borderRadius: "var(--r-lg)",
              cursor: "pointer", background: "var(--clr-surface-container-low)", textAlign: "left",
            }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "var(--r-lg)", background: "var(--clr-approaching-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>📷</div>
              <div>
                <div style={{ fontSize: "var(--fs-body-md)", fontWeight: 600, color: "var(--clr-on-surface)" }}>Scan QR / Barcode</div>
                <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "2px" }}>Use your camera to scan a product barcode</div>
              </div>
            </button>

            <div style={{ textAlign: "center", marginTop: "4px" }}>
              <button id="scan-manual-btn" onClick={() => setStep(1)} style={{ background: "transparent", border: "none", color: "var(--clr-secondary)", cursor: "pointer", fontSize: "var(--fs-body-sm)", fontWeight: 500 }}>
                Enter details manually instead →
              </button>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {showQR && (
          <div style={{ textAlign: "center" }} className="fade-in">
            <div style={{ border: "1px solid var(--clr-outline-variant)", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: "16px", display: "inline-block" }}>
              <BarcodeScanner width={340} height={280} onUpdate={handleQR} />
            </div>
            <button onClick={() => setShowQR(false)} className="btn-ghost" style={{ width: "100%" }}>← Back to options</button>
          </div>
        )}

        {/* STEP 1: Form */}
        {step === 1 && !showQR && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="fade-in">
            <div>
              <p className="section-label">Medicine Details</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <InputRow label="Brand Name *"   name="brand_name"   value={form.brand_name}   onChange={handleChange} placeholder="e.g. Crocin 500mg" />
                <InputRow label="Generic Name *" name="generic_name" value={form.generic_name} onChange={handleChange} placeholder="e.g. Paracetamol" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <InputRow label="Dosage Form"  name="dosage_form"  value={form.dosage_form}  onChange={handleChange} placeholder="Tablet" />
                  <InputRow label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. GSK" />
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--clr-outline-variant)", paddingTop: "16px" }}>
              <p className="section-label">Inventory Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <InputRow label="Stock Quantity *" name="stock_qty"   type="number" value={form.stock_qty}   onChange={handleChange} placeholder="0" />
                <InputRow label="Price (₹) *"      name="price"       type="number" value={form.price}       onChange={handleChange} placeholder="0.00" />
                <div style={{ gridColumn: "1 / -1" }}>
                  <InputRow label="Expiry Date *"  name="expiry_date" type="date"   value={form.expiry_date} onChange={handleChange} />
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--clr-outline-variant)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "var(--clr-secondary)" }} />
                <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)" }}>
                  I confirm this information is accurate and accept the terms
                </span>
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(0)} className="btn-ghost" style={{ flex: 1 }}>← Back</button>
                <button id="scan-submit-btn" onClick={submit} disabled={submitLoading} className="btn-primary" style={{ flex: 2 }}>
                  {submitLoading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : "Add to Inventory"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}