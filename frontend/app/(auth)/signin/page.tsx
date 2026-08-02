"use client";

import React, { useState } from "react";
import Link from "next/link";
import API from "@/lib/api";

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });
      const token = res.data.accessToken || res.data.access_token;
      localStorage.setItem("token", token);
      if (res.data.user?.name) {
        localStorage.setItem("pharmacy_name", res.data.user.name);
      }
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Login failed. Please check your credentials.");
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
      {/* ── Left Editorial Panel (Near-Black Ink #181d26) ── */}
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
            Licensed B2B Near-Expiry Exchange
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, maxWidth: "380px" }}>
            Prevent pharmaceutical waste, track expiry decay, and connect directly with verified pharmacies.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "40px" }}>
            {["Verified Pharmacy Badges", "Direct Delivery", "Pay on Delivery", "Form 19 Compliance"].map((f) => (
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
            Sign In to Pharmacy Account
          </h2>
          <p style={{ fontSize: "14px", color: "#41454d", marginBottom: "28px" }}>
            Enter your credentials to access exchange inventory
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

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="signin-email" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="pharmacy@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "12px 14px",
                  border: "1px solid #dddddd",
                  borderRadius: "6px",
                  outline: "none",
                }}
                required
              />
            </div>

            <div>
              <label htmlFor="signin-password" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#181d26", marginBottom: "6px" }}>
                Password
              </label>
              <input
                id="signin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                spellCheck={false}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  padding: "12px 14px",
                  border: "1px solid #dddddd",
                  borderRadius: "6px",
                  outline: "none",
                }}
                required
              />
            </div>

            <button
              id="signin-submit-btn"
              type="submit"
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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#41454d", marginTop: "24px" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "#181d26", fontWeight: 600, textDecoration: "underline" }}>
              Register Pharmacy
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