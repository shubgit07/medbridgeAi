import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",   // ← non-blocking font load
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",   // ← non-blocking font load
});

export const metadata: Metadata = {
  title: "MediBridge | Pharma Marketplace",
  description: "Licensed B2B near-expiry pharmaceutical exchange with secure escrow.",
};

import Navigate from "@/components/NavigationBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ height: "100%" }}
    >
      <body style={{ minHeight: "100%", display: "flex", flexDirection: "column", margin: 0 }}>
        <Navigate />
        {children}
      </body>
    </html>
  );
}
