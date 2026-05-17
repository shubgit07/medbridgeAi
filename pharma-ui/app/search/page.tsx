"use client";

import { useState, useCallback } from "react";
import MedicineCard from "../../components/MedicineCard";

interface SearchResult {
  medicine_id:  number;
  brand_name:   string;
  generic_name: string;
  dosage_form?: string;
  manufacturer?: string;
  stock:         number;
  expiry_date:   string;
  price:         number;
  user_id:       number;
}

export default function SearchPage() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res  = await fetch(`http://localhost:8000/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div className="page-container" style={{ minHeight: "calc(100vh - 56px)" }}>

      {/* Hero search bar */}
      <div className="fade-in" style={{ textAlign: "center", marginBottom: "40px" }}>
        <p className="section-label" style={{ justifyContent: "center", display: "flex" }}>Medicine Search</p>
        <h1 style={{
          fontSize: "var(--fs-display)", fontWeight: 700,
          color: "var(--clr-on-surface)", letterSpacing: "-0.02em",
          margin: "0 0 8px",
        }}>
          Find any medicine
        </h1>
        <p style={{ fontSize: "var(--fs-body-md)", color: "var(--clr-on-surface-variant)", marginBottom: "28px" }}>
          Search by brand name or generic name across the inventory
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth:    "780px",
            margin:      "0 auto",
            display:     "flex",
            gap:         "10px",
          }}
        >
          <input
            id="search-input"
            type="text"
            placeholder="e.g. Paracetamol, Crocin…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-field"
            style={{ flex: 1, fontSize: "var(--fs-body-md)", padding: "12px 16px" }}
            autoFocus
          />
          <button
            id="search-submit-btn"
            type="submit"
            className="btn-secondary"
            style={{ padding: "12px 24px", flexShrink: 0 }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      )}

      {/* Results grid */}
      {!loading && searched && results.length > 0 && (
        <div className="fade-in">
          <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-on-surface-variant)", marginBottom: "16px" }}>
            {results.length} result{results.length !== 1 ? "s" : ""} found for <strong>&quot;{query}&quot;</strong>
          </p>
          <div style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap:                 "16px",
          }}>
            {results.map((r, i) => (
              <MedicineCard
                key={`${r.medicine_id}-${i}`}
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

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div
          className="fade-in"
          style={{
            textAlign:     "center",
            padding:       "64px 24px",
            color:         "var(--clr-on-surface-variant)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
          <div style={{ fontSize: "var(--fs-headline)", fontWeight: 600, color: "var(--clr-on-surface)", marginBottom: "8px" }}>
            No medicines found
          </div>
          <div style={{ fontSize: "var(--fs-body-md)", maxWidth: "340px", margin: "0 auto" }}>
            No results for &quot;{query}&quot;. Try a different name or check spelling.
          </div>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap:                 "12px",
            maxWidth:            "900px",
            margin:              "0 auto",
            opacity:             0.7,
          }}
        >
          {["Search by brand name", "Find generic equivalents", "Check stock levels", "View expiry status"].map(hint => (
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