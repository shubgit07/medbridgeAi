"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/search",    label: "Search",    auth: false },
  { href: "/inventory", label: "Inventory", auth: true  },
  { href: "/dashboard", label: "Dashboard", auth: true  },
];

export default function Navbar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [pharmacyName,  setPharmacyName]  = useState("");
  const [menuOpen,      setMenuOpen]      = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const name  = localStorage.getItem("pharmacy_name");
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
        style={{
          position:        "sticky",
          top:             0,
          zIndex:          50,
          background:      "var(--clr-surface)",
          borderBottom:    "1px solid var(--clr-outline-variant)",
          boxShadow:       "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth:        "1200px",
            margin:          "0 auto",
            padding:         "0 var(--sp-container)",
            height:          "56px",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            gap:             "24px",
          }}
        >
          {/* ── Brand ── */}
          <Link
            href="/"
            style={{
              display:     "flex",
              alignItems:  "center",
              gap:         "8px",
              textDecoration: "none",
              flexShrink:  0,
            }}
          >
            <span
              style={{
                width:           "30px",
                height:          "30px",
                borderRadius:    "var(--r-md)",
                background:      "var(--clr-primary)",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                color:           "#fff",
                fontSize:        "14px",
                fontWeight:      700,
                letterSpacing:   "-0.02em",
              }}
            >
              M
            </span>
            <span
              style={{
                fontSize:   "var(--fs-body-lg)",
                fontWeight: 700,
                color:      "var(--clr-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              MediRelife
            </span>
            {pharmacyName && (
              <span
                style={{
                  display:    "none",
                  fontSize:   "var(--fs-body-sm)",
                  color:      "var(--clr-on-surface-variant)",
                  fontWeight: 400,
                }}
                className="md-show"
              >
                / {pharmacyName}
              </span>
            )}
          </Link>

          {/* ── Desktop nav links ── */}
          <div
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "4px",
            }}
            className="nav-desktop"
          >
            {NAV_LINKS.filter(l => !l.auth || isLoggedIn).map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding:       "6px 12px",
                  borderRadius:  "var(--r-md)",
                  fontSize:      "var(--fs-body-md)",
                  fontWeight:    isActive(link.href) ? 600 : 400,
                  color:         isActive(link.href)
                    ? "var(--clr-secondary)"
                    : "var(--clr-on-surface-variant)",
                  background:    isActive(link.href)
                    ? "rgba(0, 88, 190, 0.08)"
                    : "transparent",
                  textDecoration: "none",
                  transition:    "background 0.15s, color 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right actions ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {isLoggedIn ? (
              <>
                <Link
                  href="/scan"
                  className="btn-secondary"
                  style={{ padding: "7px 14px", fontSize: "var(--fs-body-sm)" }}
                >
                  + Add Medicine
                </Link>
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogout}
                  className="btn-ghost"
                  style={{ padding: "7px 14px", fontSize: "var(--fs-body-sm)" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="btn-ghost"
                  style={{ padding: "7px 14px", fontSize: "var(--fs-body-sm)" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn-secondary"
                  style={{ padding: "7px 14px", fontSize: "var(--fs-body-sm)" }}
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              id="navbar-menu-toggle"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display:      "none",
                background:   "transparent",
                border:       "1px solid var(--clr-outline-variant)",
                borderRadius: "var(--r-md)",
                padding:      "6px 8px",
                cursor:       "pointer",
                color:        "var(--clr-on-surface)",
                fontSize:     "18px",
              }}
              className="nav-mobile-toggle"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown ── */}
        {menuOpen && (
          <div
            style={{
              borderTop:  "1px solid var(--clr-outline-variant)",
              background: "var(--clr-surface)",
              padding:    "12px var(--sp-container) 16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {NAV_LINKS.filter(l => !l.auth || isLoggedIn).map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    padding:       "10px 12px",
                    borderRadius:  "var(--r-md)",
                    fontSize:      "var(--fs-body-md)",
                    fontWeight:    isActive(link.href) ? 600 : 400,
                    color:         isActive(link.href)
                      ? "var(--clr-secondary)"
                      : "var(--clr-on-surface)",
                    background:    isActive(link.href)
                      ? "rgba(0, 88, 190, 0.08)"
                      : "transparent",
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
                    className="btn-secondary"
                    style={{ marginTop: "8px", justifyContent: "center" }}
                  >
                    + Add Medicine
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="btn-ghost"
                    style={{ marginTop: "4px", width: "100%", justifyContent: "center" }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    onClick={() => setMenuOpen(false)}
                    className="btn-ghost"
                    style={{ marginTop: "8px", justifyContent: "center" }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="btn-secondary"
                    style={{ marginTop: "4px", justifyContent: "center" }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Inline responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}