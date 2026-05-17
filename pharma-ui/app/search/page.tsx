"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import MedicineCard from "@/components/MedicineCard";

interface SearchResult {
  medicine_id:   number;
  brand_name:    string;
  generic_name:  string;
  dosage_form?:  string;
  manufacturer?: string;
  stock:         number;
  expiry_date:   string;
  price:         number;
  user_id:       number;
}

const HINTS = [
  "Search by brand name",
  "Find generic equivalents",
  "Check stock levels",
  "View expiry status",
];

export default function SearchPage() {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState("");

  // Debounce ref — cancels in-flight timeout when user keeps typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); setError(""); return; }
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/search?query=${encodeURIComponent(q)}`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.name !== "TimeoutError" && err.name !== "AbortError") {
        setError("Could not reach backend. Is the API running?");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live debounced search (400 ms after user stops typing)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    search(query);
  };

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="page-container" style={{ minHeight: "calc(100vh - 56px)" }}>

      {/* ── Hero search bar ── */}
      <div className="fade-in" style={{ textAlign: "center", marginBottom: "40px" }}>
        <p className="section-label" style={{ justifyContent: "center", display: "flex" }}>
          Medicine Search
        </p>
        <h1 style={{
          fontSize: "var(--fs-display)", fontWeight: 700,
          color: "var(--clr-on-surface)", letterSpacing: "-0.02em", margin: "0 0 8px",
        }}>
          Find any medicine
        </h1>
        <p style={{ fontSize: "var(--fs-body-md)", color: "var(--clr-on-surface-variant)", marginBottom: "28px" }}>
          Search by brand name or generic name across the inventory
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: "780px", margin: "0 auto", display: "flex", gap: "10px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              id="search-input"
              type="text"
              placeholder="e.g. Paracetamol, Crocin…"
              value={query}
              onChange={handleChange}
              className="input-field"
              style={{ width: "100%", fontSize: "var(--fs-body-md)", padding: "12px 40px 12px 16px" }}
              autoFocus
              autoComplete="off"
            />
            {/* Inline spinner inside input */}
            {loading && (
              <span className="spinner" style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)", width: 16, height: 16,
              }} />
            )}
          </div>
          <button
            id="search-submit-btn"
            type="submit"
            className="btn-secondary"
            style={{ padding: "12px 24px", flexShrink: 0 }}
            disabled={loading}
          >
            Search
          </button>
        </form>

        {/* Error banner */}
        {error && (
          <div style={{
            maxWidth: "780px", margin: "12px auto 0",
            background: "var(--clr-error-container)", color: "var(--clr-error)",
            borderRadius: "var(--r-md)", padding: "10px 14px",
            fontSize: "var(--fs-body-sm)", border: "1px solid rgba(186,26,26,0.2)",
            textAlign: "left",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Results grid ── */}
      {!loading && searched && results.length > 0 && (
        <div className="fade-in">
          <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginBottom: "16px" }}>
            {results.length} result{results.length !== 1 ? "s" : ""} for <strong>&quot;{query}&quot;</strong>
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}>
            {results.map((r) => (
              <MedicineCard
                key={r.medicine_id}
                brand_name={r.brand_name}
                generic_name={r.generic_name}
                dosage_form={r.dosage_form}
                manufacturer={r.manufacturer}
                stock={r.stock}
                expiry_date={r.expiry_date}
                price={r.price}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && searched && results.length === 0 && !error && (
        <div className="fade-in" style={{ textAlign: "center", padding: "64px 24px", color: "var(--clr-on-surface-variant)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <div style={{ fontSize: "var(--fs-headline)", fontWeight: 600, color: "var(--clr-on-surface)", marginBottom: "8px" }}>
            No medicines found
          </div>
          <div style={{ fontSize: "var(--fs-body-md)", maxWidth: "340px", margin: "0 auto" }}>
            No results for &quot;{query}&quot;. Try a different name or check spelling.
          </div>
        </div>
      )}

      {/* ── Initial hint state ── */}
      {!loading && !searched && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px", maxWidth: "900px", margin: "0 auto", opacity: 0.7,
        }}>
          {HINTS.map(hint => (
            <div
              key={hint}
              className="card"
              style={{ textAlign: "center", padding: "16px", fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)" }}
            >
              {hint}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}