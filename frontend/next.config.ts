import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ─── Turbopack: pin the watcher root to THIS directory only ───────────────
  // Without this, Turbopack walks up looking for lockfiles and can latch onto
  // C:\Users\a\package-lock.json — watching the ENTIRE home dir → 100% disk.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // ─── React strict mode: catches side-effect bugs early in dev ─────────────
  reactStrictMode: true,

  // ─── Faster dev & smaller prod bundles ────────────────────────────────────
  experimental: {
    // Tree-shake only the icons/components you import, not the whole pkg
    optimizePackageImports: ["axios"],
  },

  // ─── Disable telemetry noise in dev logs ──────────────────────────────────
  // (Next.js sends anonymous usage stats; silence for clean terminal output)

  // ─── Image domains – extend when you add real CDN images ──────────────────
  images: {
    remotePatterns: [],
    // Disables the <img> warning for pages not using next/image
    unoptimized: false,
  },
};

export default nextConfig;
