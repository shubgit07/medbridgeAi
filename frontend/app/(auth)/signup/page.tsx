"use client";

import { useState } from "react";
import Link from "next/link";
import API from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const signup = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/signup", form);
      const token = res.data.accessToken || res.data.user_id;
      if (token) localStorage.setItem("token", token);
      if (form.name) localStorage.setItem("pharmacy_name", form.name);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "#ffffff",
      }}
    >
      {/* ── Left Editorial Panel ── */}
      <div
        style={{
          background: "#181d26",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          position: "relative",
        }}
        className="auth-panel"
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#181d26",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              M
            </span>
            <span style={{ fontSize: "20px", fontWeight: 600, color: "#ffffff" }}>MedBridge</span>
          </div>

          <h1 style={{ fontSize: "36px", fontWeight: 400, color: "#ffffff", lineHeight: 1.2, marginBottom: "16px" }}>
            Join the B2B Pharmacy Network
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, maxWidth: "380px" }}>
            Register your licensed pharmacy to list near-expiry medicines, find generic salt substitutes, and buy at discounted prices.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "40px" }}>
            {["Form 20/21 Verification", "Direct Delivery", "Pay on Delivery", "Free Registration"].map((f) => (
              <span
                key={f}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#ffffff",
                  borderRadius: 9999,
                  padding: "4px 14px",
                  fontSize: "12px",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Form Panel (Vercel Guidelines: autocomplete & spellCheck=false) ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px",
          background: "#ffffff",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
            Register Pharmacy
          </h2>
          <p style={{ fontSize: "14px", color: "#41454d", marginBottom: "28px" }}>
            Create your account to start trading near-expiry stock
          </p>

          {error && (
            <div
              aria-live="polite"
              style={{
                background: "#fef2f2",
                color: "#aa2d00",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "13px",
                marginBottom: "20px",
                border: "1px solid #fca5a5",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="signup-name" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
                Pharmacy Name *
              </label>
              <input
                id="signup-name"
                name="name"
                autoComplete="organization"
                placeholder="e.g. City Retail Pharmacy"
                onChange={handleChange}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "12px 14px",
                  border: "1px solid #dddddd",
                  borderRadius: "6px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label htmlFor="signup-email" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
                Email Address *
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@pharmacy.com"
                onChange={handleChange}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "12px 14px",
                  border: "1px solid #dddddd",
                  borderRadius: "6px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label htmlFor="signup-password" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
                Password *
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                placeholder="Create secure password"
                onChange={handleChange}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "12px 14px",
                  border: "1px solid #dddddd",
                  borderRadius: "6px",
                  outline: "none",
                }}
              />
            </div>

            <button
              id="signup-submit-btn"
              type="button"
              onClick={signup}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: "#181d26",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                marginTop: "6px",
              }}
            >
              {loading ? "Registering…" : "Complete Registration"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#41454d", marginTop: "24px" }}>
            Already registered?{" "}
            <Link href="/signin" style={{ color: "#181d26", fontWeight: 600, textDecoration: "underline" }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}