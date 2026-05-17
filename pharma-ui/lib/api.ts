/**
 * lib/api.ts — Axios client for the MediRelife FastAPI backend.
 *
 * Usage:
 *   import API from "@/lib/api";
 *   const res = await API.get("/medicines");
 *
 * Base URL is read from NEXT_PUBLIC_API_URL in .env.local so you never
 * need to touch this file when switching between local / staging / prod.
 */

import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
  timeout: 15_000, // 15 s — prevents hung requests from freezing the UI
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request interceptor ───────────────────────────────────────────────────
// Attach the auth token (stored in localStorage) to every request.
// Server-side requests (SSR/RSC) skip this because localStorage is undefined.
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────
// Log errors in dev; redirect to /signin on 401.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("[API Error]", error?.response?.status, error?.config?.url);
    }
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("pharmacy_name");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

export default API;
