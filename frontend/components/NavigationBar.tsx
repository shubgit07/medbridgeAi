"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/search", label: "Medicine Search", auth: false },
  { href: "/marketplace", label: "Marketplace Exchange", auth: false },
  { href: "/inventory", label: "My Inventory", auth: true },
  { href: "/dashboard", label: "Dashboard", auth: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("pharmacy_name");
    setIsLoggedIn(!!token);
    setPharmacyName(name || "");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("pharmacy_name");
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav
        aria-label="Main Navigation"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#ffffff",
          borderBottom: "1px solid #dddddd",
          height: "64px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 24px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          {/* ── Brand Logo Link (Vercel Guidelines: aria-label) ── */}
          <Link
            href="/"
            aria-label="MedBridge Near-Expiry Exchange Home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: "#181d26",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              M
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#181d26",
                letterSpacing: "-0.02em",
              }}
            >
              MedBridge
            </span>
            {pharmacyName && (
              <span
                style={{
                  fontSize: "13px",
                  color: "#41454d",
                  fontWeight: 400,
                }}
              >
                / {pharmacyName}
              </span>
            )}
          </Link>

          {/* ── Desktop Nav Links (Vercel Guidelines: aria-current) ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            className="nav-desktop"
          >
            {NAV_LINKS.filter((l) => !l.auth || isLoggedIn).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: isActive(link.href) ? 600 : 400,
                  color: isActive(link.href) ? "#181d26" : "#41454d",
                  background: isActive(link.href) ? "#f8fafc" : "transparent",
                  textDecoration: "none",
                  border: isActive(link.href) ? "1px solid #dddddd" : "1px solid transparent",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right Action Buttons ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {isLoggedIn ? (
              <>
                <Link
                  href="/scan"
                  style={{
                    background: "#181d26",
                    color: "#ffffff",
                    borderRadius: "12px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  + Add Stock
                </Link>
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogout}
                  type="button"
                  style={{
                    background: "#ffffff",
                    color: "#181d26",
                    border: "1px solid #dddddd",
                    borderRadius: "12px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  style={{
                    background: "#ffffff",
                    color: "#181d26",
                    border: "1px solid #dddddd",
                    borderRadius: "12px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  style={{
                    background: "#181d26",
                    color: "#ffffff",
                    borderRadius: "12px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle (Vercel Guidelines: aria-label & aria-expanded) */}
            <button
              id="navbar-menu-toggle"
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: "none",
                background: "#ffffff",
                border: "1px solid #dddddd",
                borderRadius: "10px",
                padding: "6px 10px",
                cursor: "pointer",
                color: "#181d26",
                fontSize: "18px",
              }}
              className="nav-mobile-toggle"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown Sheet ── */}
        {menuOpen && (
          <div
            style={{
              borderTop: "1px solid #dddddd",
              background: "#ffffff",
              padding: "16px 24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {NAV_LINKS.filter((l) => !l.auth || isLoggedIn).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: isActive(link.href) ? 600 : 400,
                    color: isActive(link.href) ? "#181d26" : "#41454d",
                    background: isActive(link.href) ? "#f8fafc" : "transparent",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {isLoggedIn ? (
                <>
                  <Link
                    href="/scan"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      background: "#181d26",
                      color: "#ffffff",
                      borderRadius: "12px",
                      padding: "12px",
                      textAlign: "center",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginTop: "8px",
                    }}
                  >
                    + Add Stock
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    style={{
                      background: "#ffffff",
                      color: "#181d26",
                      border: "1px solid #dddddd",
                      borderRadius: "12px",
                      padding: "12px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      marginTop: "4px",
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      background: "#ffffff",
                      color: "#181d26",
                      border: "1px solid #dddddd",
                      borderRadius: "12px",
                      padding: "12px",
                      textAlign: "center",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginTop: "8px",
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      background: "#181d26",
                      color: "#ffffff",
                      borderRadius: "12px",
                      padding: "12px",
                      textAlign: "center",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: 500,
                      marginTop: "4px",
                    }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Inline Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}