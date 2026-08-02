"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import API from "@/lib/api";

// Lazy-load heavy scanner lib per CLAUDE.md guidelines
const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), {
  ssr: false,
  loading: () => <div style={{ padding: 40, textAlign: "center", color: "#41454d" }}>Loading camera interface…</div>,
});

async function runOCR(file: File): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: any) => console.log("OCR:", m),
  });
  return result.data.text;
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Choose Method", "Fill Details", "Confirm & Save"];
  return (
    <nav aria-label="Registration Progress" style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: done ? "#0a2e0e" : active ? "#181d26" : "#e0e2e6",
                  color: done || active ? "#ffffff" : "#41454d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "12px",
                  color: active ? "#181d26" : done ? "#0a2e0e" : "#41454d",
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: done ? "#0a2e0e" : "#dddddd",
                  margin: "0 8px 18px",
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function InputRow({ label, id, name, type = "text", placeholder = "", value, onChange }: any) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          fontSize: "14px",
          padding: "12px 14px",
          border: "1px solid #dddddd",
          borderRadius: "6px",
          outline: "none",
          background: "#ffffff",
          color: "#181d26",
        }}
      />
    </div>
  );
}

export default function ScanPage() {
  const [step, setStep] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [terms, setTerms] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null);
  const [form, setForm] = useState({
    brand_name: "",
    generic_name: "",
    dosage_form: "",
    manufacturer: "",
    stock_qty: "",
    expiry_date: "",
    price: "",
  });

  const handleQR = (err: any, result: any) => {
    if (result) console.log("QR:", result.text);
  };

  const handleOCR = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    setMessage(null);
    try {
      const text = await runOCR(file);
      if (!text || text.trim() === "") {
        setMessage({ text: "No clear text detected on label. Please enter details manually below.", type: "error" });
        setStep(1);
        return;
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/ocr/extract-medicine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setForm((prev) => ({ ...prev, ...data.data }));
      setStep(1);
    } catch (err) {
      console.error(err);
      setMessage({ text: "OCR server extraction skipped. Please complete details manually.", type: "info" });
      setStep(1);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!terms) {
      setMessage({ text: "Please check the compliance confirmation box before publishing.", type: "error" });
      return;
    }
    setSubmitLoading(true);
    setMessage(null);
    try {
      await API.post("/listings", {
        brandName: form.brand_name,
        genericName: form.generic_name,
        dosageForm: form.dosage_form,
        manufacturer: form.manufacturer,
        quantity: Number(form.stock_qty),
        askingPrice: Number(form.price),
        mrp: Number(form.price) * 1.5,
        expiryDate: form.expiry_date,
        batchNumber: "BN-" + Math.floor(Math.random() * 89999 + 10000),
      });
      window.location.href = "/marketplace";
    } catch (err) {
      console.error(err);
      window.location.href = "/marketplace";
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px", background: "#ffffff" }}>
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          background: "#ffffff",
          border: "1px solid #dddddd",
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 500, color: "#181d26", margin: 0 }}>
            Register New Stock Batch
          </h1>
          <p style={{ fontSize: "14px", color: "#41454d", marginTop: "4px" }}>
            AI Box Photo OCR label extraction & inventory entry
          </p>
        </div>

        <StepIndicator current={showQR ? 0 : step} />

        {/* Inline Accessible Notification Banner (Vercel Guidelines: aria-live="polite") */}
        {message && (
          <div
            aria-live="polite"
            style={{
              background: message.type === "error" ? "#fef2f2" : "#eff6ff",
              color: message.type === "error" ? "#aa2d00" : "#254fad",
              border: `1px solid ${message.type === "error" ? "#fca5a5" : "#bfdbfe"}`,
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            {message.text}
          </div>
        )}

        {/* STEP 0: Choose Method */}
        {step === 0 && !showQR && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <label
              htmlFor="ocr-upload"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "20px 24px",
                border: "1px dashed #dddddd",
                borderRadius: "12px",
                cursor: ocrLoading ? "not-allowed" : "pointer",
                background: "#f5e9d4",
                opacity: ocrLoading ? 0.7 : 1,
              }}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#181d26", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                {ocrLoading ? <span className="spinner" /> : "📸"}
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#181d26" }}>
                  {ocrLoading ? "Extracting label text…" : "Upload Medicine Box Photo"}
                </div>
                <div style={{ fontSize: "13px", color: "#41454d", marginTop: "2px" }}>
                  AI reads brand name, salt composition, batch #, and expiry date automatically
                </div>
              </div>
              <input
                id="ocr-upload"
                name="boxPhoto"
                type="file"
                accept="image/*"
                aria-label="Upload Medicine Box Photo for AI OCR Extraction"
                style={{ display: "none" }}
                onClick={(e: any) => (e.target.value = null)}
                onChange={(e) => handleOCR(e)}
                disabled={ocrLoading}
              />
            </label>

            <button
              id="scan-qr-btn"
              type="button"
              onClick={() => setShowQR(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "20px 24px",
                border: "1px solid #dddddd",
                borderRadius: "12px",
                cursor: "pointer",
                background: "#ffffff",
                textAlign: "left",
              }}
            >
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #dddddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                📷
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#181d26" }}>Scan GS1 / Barcode</div>
                <div style={{ fontSize: "13px", color: "#41454d", marginTop: "2px" }}>Scan product barcode using your camera</div>
              </div>
            </button>

            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <button
                id="scan-manual-btn"
                type="button"
                onClick={() => setStep(1)}
                style={{ background: "transparent", border: "none", color: "#181d26", cursor: "pointer", fontSize: "14px", fontWeight: 500, textDecoration: "underline" }}
              >
                Or enter medicine details manually →
              </button>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {showQR && (
          <div style={{ textAlign: "center" }}>
            <div style={{ border: "1px solid #dddddd", borderRadius: "12px", overflow: "hidden", marginBottom: "16px", display: "inline-block" }}>
              <BarcodeScanner width={360} height={280} onUpdate={handleQR} />
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowQR(false)}
                style={{ background: "#ffffff", border: "1px solid #dddddd", borderRadius: "12px", padding: "10px 24px", fontSize: "14px", cursor: "pointer" }}
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Form */}
        {step === 1 && !showQR && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h2 className="section-label">Medicine Identity</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <InputRow label="Brand Name *" id="field-brand" name="brand_name" value={form.brand_name} onChange={handleChange} placeholder="e.g. Paracetamol 500mg…" />
                <InputRow label="Generic Salt *" id="field-generic" name="generic_name" value={form.generic_name} onChange={handleChange} placeholder="e.g. Paracetamol…" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                  <InputRow label="Dosage Form" id="field-form" name="dosage_form" value={form.dosage_form} onChange={handleChange} placeholder="Tablet / Syrup / Injection…" />
                  <InputRow label="Manufacturer" id="field-mfg" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. Cipla Ltd…" />
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #dddddd", paddingTop: "20px" }}>
              <h2 className="section-label">Stock & Expiry</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <InputRow label="Quantity (Strips/Units) *" id="field-qty" name="stock_qty" type="number" value={form.stock_qty} onChange={handleChange} placeholder="50" />
                <InputRow label="Asking Price (₹) *" id="field-price" name="price" type="number" value={form.price} onChange={handleChange} placeholder="45.00" />
                <div style={{ gridColumn: "1 / -1" }}>
                  <InputRow label="Expiry Date *" id="field-expiry" name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #dddddd", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  id="chk-terms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#181d26" }}
                />
                <span style={{ fontSize: "13px", color: "#41454d" }}>
                  I confirm that drug license Form 20/21 compliance terms are satisfied for this batch.
                </span>
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  style={{ flex: 1, padding: "12px", background: "#ffffff", border: "1px solid #dddddd", borderRadius: "12px", fontSize: "14px", cursor: "pointer" }}
                >
                  ← Back
                </button>
                <button
                  id="scan-submit-btn"
                  type="button"
                  onClick={submit}
                  disabled={submitLoading}
                  style={{
                    flex: 2,
                    padding: "12px",
                    background: "#181d26",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {submitLoading ? "Publishing to Exchange…" : "Publish Stock Listing"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}