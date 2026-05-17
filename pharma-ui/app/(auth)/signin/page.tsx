"use client";

import React, { useState } from "react";
import Link from "next/link";
import API from "@/lib/api";

export default function SigninPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/login", { email, password });
      const token = res.data.access_token;
      localStorage.setItem("token", token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight:       "100vh",
        display:         "grid",
        gridTemplateColumns: "1fr 1fr",
        background:      "var(--clr-bg)",
      }}
    >
      {/* ── Left decorative panel ── */}
      <div
        style={{
          background:     "var(--clr-primary)",
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "center",
          padding:        "60px 56px",
          position:       "relative",
          overflow:       "hidden",
        }}
        className="auth-panel"
      >
        {/* Background circles */}
        <div style={{
          position: "absolute", width: "400px", height: "400px",
          borderRadius: "50%", background: "rgba(255,255,255,0.04)",
          top: "-80px", right: "-80px",
        }} />
        <div style={{
          position: "absolute", width: "260px", height: "260px",
          borderRadius: "50%", background: "rgba(255,255,255,0.04)",
          bottom: "60px", left: "-60px",
        }} />

        {/* Brand */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            marginBottom: "48px",
          }}>
            <span style={{
              width: "36px", height: "36px", borderRadius: "var(--r-md)",
              background: "rgba(255,255,255,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#fff",
            }}>M</span>
            <span style={{ fontSize: "var(--fs-body-lg)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              MediRelife
            </span>
          </div>

          <h1 style={{
            fontSize: "32px", fontWeight: 700, color: "#fff",
            lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: "16px",
          }}>
            Smarter pharmacy<br />inventory management.
          </h1>
          <p style={{ fontSize: "var(--fs-body-md)", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: "340px" }}>
            Track stock, scan medicines with OCR, and stay ahead of expiry dates — all in one place.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "40px" }}>
            {["OCR Scanning", "Inventory Tracking", "Expiry Alerts", "Fast Search"].map(f => (
              <span key={f} style={{
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)",
                borderRadius: "var(--r-full)", padding: "4px 12px",
                fontSize: "var(--fs-body-sm)", border: "1px solid rgba(255,255,255,0.15)",
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "center",
          alignItems:     "center",
          padding:        "60px 48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }} className="fade-in">
          <h2 style={{
            fontSize: "var(--fs-display)", fontWeight: 700,
            color: "var(--clr-on-surface)", marginBottom: "8px",
            letterSpacing: "-0.02em",
          }}>
            Welcome back
          </h2>
          <p style={{ fontSize: "var(--fs-body-md)", color: "var(--clr-on-surface-variant)", marginBottom: "32px" }}>
            Sign in to your pharmacy account
          </p>

          {error && (
            <div style={{
              background: "var(--clr-error-container)", color: "var(--clr-error)",
              borderRadius: "var(--r-md)", padding: "10px 14px",
              fontSize: "var(--fs-body-sm)", marginBottom: "20px",
              border: "1px solid rgba(186,26,26,0.2)",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--clr-on-surface)", marginBottom: "6px" }}>
                Email address
              </label>
              <input
                id="signin-email"
                type="email"
                placeholder="you@pharmacy.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "var(--fs-body-sm)", fontWeight: 500, color: "var(--clr-on-surface)", marginBottom: "6px" }}>
                Password
              </label>
              <input
                id="signin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <button
              id="signin-submit-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "12px", marginTop: "4px", fontSize: "var(--fs-body-md)" }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginTop: "24px" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--clr-secondary)", fontWeight: 600, textDecoration: "none" }}>
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .auth-panel { display: none !important; }
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}