"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, SearchX } from "lucide-react";
import MedicineCard from "@/components/MedicineCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResult {
  medicine_id: string;
  brand_name: string;
  generic_name?: string;
  dosage_form?: string;
  manufacturer?: string;
  stock?: number;
  expiry_date?: string;
  days_left?: number;
  price?: number;
}

const HINTS = ["Crocin", "Dolo", "Paracetamol", "Azithromycin"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef("");

  const search = useCallback(async (q: string) => {
    lastQueryRef.current = q;
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setError("");
      return;
    }
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(
        `${baseUrl}/drugs/search?q=${encodeURIComponent(q)}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const list = Array.isArray(data.drugs)
        ? data.drugs
        : Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

      /* Display only what the catalog actually provides - no fabricated defaults */
      const now = Date.now();
      const formatted: SearchResult[] = list.map(
        (item: Record<string, unknown>, i: number) => {
          const expiry = (item.expiry_date as string) ?? undefined;
          return {
            medicine_id: String(item.id ?? `result-${i}`),
            brand_name:
              (item.brandName as string) ?? (item.brand_name as string) ?? "Unnamed drug",
            generic_name: (item.saltName as string) ?? (item.generic_name as string),
            dosage_form: (item.form as string) ?? (item.dosage_form as string),
            manufacturer: item.manufacturer as string | undefined,
            stock: typeof item.stock === "number" ? item.stock : undefined,
            expiry_date: expiry,
            days_left: expiry
              ? Math.round((new Date(expiry).getTime() - now) / (1000 * 60 * 60 * 24))
              : undefined,
            price: typeof item.price === "number" ? item.price : undefined,
          };
        },
      );

      setResults(formatted);
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name !== "TimeoutError" && name !== "AbortError") {
        setError("Couldn't reach the catalog service. Check your connection and retry.");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLast = useCallback(() => {
    search(lastQueryRef.current);
  }, [search]);

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

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <div className="fade-in mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
          Medicine search &amp; substitute finder
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
          Find any medicine in the catalog
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Instant search across generic salts, brand names, and active inventory.
        </p>

        <form onSubmit={handleSubmit} className="mx-auto mt-7 flex max-w-xl gap-2.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="search-input" className="sr-only">
              Search medicines by brand or generic salt name
            </label>
            <Input
              id="search-input"
              name="drugSearch"
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Brand or salt (e.g., Paracetamol, Crocin)…"
              value={query}
              onChange={handleChange}
              autoFocus
              className="h-11 rounded-lg pr-10 pl-10"
            />
            {loading && (
              <Loader2
                className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-label="Searching catalog"
              />
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 bg-brand px-5 hover:bg-brand-strong"
          >
            Search
          </Button>
        </form>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-left"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={retryLast}
            disabled={loading}
            className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Idle hint chips */}
      {!loading && !searched && (
        <div className="fade-in mx-auto mt-12 max-w-xl text-center">
          <p className="text-sm text-muted-foreground">Try one of these:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => {
                  setQuery(hint);
                  search(hint);
                }}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground transition-colors outline-offset-2 hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
              >
                {hint}
              </button>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-md text-xs leading-relaxed text-muted-foreground/80">
            Search runs against the shared drug catalog with full-text and fuzzy
            matching, so spelling mistakes still find results.
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="fade-in mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-4 p-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <Skeleton className="h-5 w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && results.length > 0 && (
        <section aria-label="Search results" className="fade-in mx-auto mt-12 max-w-5xl">
          <p className="text-sm text-muted-foreground">
            Found{" "}
            <span className="font-mono font-medium tabular-nums text-foreground">
              {results.length}
            </span>{" "}
            result{results.length !== 1 ? "s" : ""} for{" "}
            <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <MedicineCard
                key={r.medicine_id}
                brand_name={r.brand_name}
                generic_name={r.generic_name}
                dosage_form={r.dosage_form}
                manufacturer={r.manufacturer}
                stock={r.stock}
                expiry_date={r.expiry_date}
                days_left={r.days_left}
                price={r.price}
              />
            ))}
          </div>
        </section>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && !error && (
        <div className="fade-in mx-auto mt-16 flex max-w-md flex-col items-center px-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <SearchX className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            No medicines found for &ldquo;{query}&rdquo;
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Try another brand name or a generic salt like Paracetamol.
          </p>
        </div>
      )}
    </div>
  );
}
