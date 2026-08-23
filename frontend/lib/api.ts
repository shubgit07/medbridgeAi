/**
 * lib/api.ts — Axios client for MedBridge Fastify backend.
 */

import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor ───
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Response Interceptor ───
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;

    if (process.env.NODE_ENV === "development") {
      if (!error?.response) {
        console.warn(`[API Server Offline] Cannot reach ${url || "backend server"}`);
      } else {
        console.warn(`[API Warning] HTTP ${status} on ${url}`);
      }
    }

    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("pharmacy_name");
    }

    return Promise.reject(error);
  }
);

export default API;
