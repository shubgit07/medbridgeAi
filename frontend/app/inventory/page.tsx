"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CircleAlert,
  PackageOpen,
  PackagePlus,
} from "lucide-react";
import API from "@/lib/api";
import StatusBadge, { deriveStatus, type BadgeStatus } from "@/components/StatusBadge";
import DecayChip from "@/components/decay-chip";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InventoryItem {
  medicine_id: number;
  brand_name: string;
  generic_name: string;
  dosage_form?: string;
  stock_qty: number;
  expiry_date: string;
  price: number;
  days_left: number;
}

type FilterKey = "all" | BadgeStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All stock" },
  { key: "stable", label: "Stable" },
  { key: "approaching", label: "Approaching" },
  { key: "urgent", label: "Urgent near-expiry" },
  { key: "expired", label: "Expired" },
];

export default function InventoryPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
      return;
    }

    let cancelled = false;
    API.get("/inventory")
      .then(({ data }) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, reloadKey, router]);

  const retry = () => {
    setFetchFailed(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const statusOf = useCallback(
    (item: InventoryItem): BadgeStatus => deriveStatus(item.days_left, item.stock_qty),
    [],
  );

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = {
      all: items.length,
      stable: 0,
      approaching: 0,
      urgent: 0,
      expired: 0,
      info: 0,
    };
    for (const item of items) base[statusOf(item)] += 1;
    return base;
  }, [items, statusOf]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => statusOf(i) === filter)),
    [items, filter, statusOf],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="fade-in flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            Pharmacy stock management
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Inventory catalog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track batch expiry decay, stock levels, and pricing at a glance.
          </p>
        </div>

        <Button asChild className="bg-brand hover:bg-brand-strong">
          <Link href="/scan">
            <PackagePlus className="size-4" aria-hidden="true" />
            Add stock batch
          </Link>
        </Button>
      </header>

      {/* Fetch error */}
      {fetchFailed && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3"
        >
          <div className="flex items-center gap-2.5 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Couldn&apos;t load your inventory. Check your connection and retry.
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={retry}
            disabled={loading}
            className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter rail */}
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Stock status filters">
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand",
                selected
                  ? "border-[var(--mb-ink)] bg-[var(--mb-ink)] text-white"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums",
                  selected ? "text-white/70" : "text-muted-foreground/70",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card className="mt-5 overflow-hidden p-0">
        {loading ? (
          /* Loading skeleton */
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.8fr)_80px_90px_160px_110px] items-center gap-4 px-6 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <PackageOpen className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              {items.length === 0
                ? "Your catalog is empty"
                : `No ${filter === "all" ? "" : filter + " "}items in your catalog`}
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {items.length === 0
                ? "Scan a medicine box label to register your first batch with AI-extracted expiry details."
                : "Switch to another status filter, or add fresh stock to fill this view."}
            </p>
            <Button asChild className="mt-5 bg-brand hover:bg-brand-strong">
              <Link href="/scan">
                <PackagePlus className="size-4" aria-hidden="true" />
                Add medicine batch
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.8fr)_80px_90px_160px_110px] items-center gap-4 border-b bg-muted/50 px-6 py-2.5">
              <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                Medicine brand
              </span>
              <span className="hidden text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase sm:block">
                Generic salt
              </span>
              <span className="hidden text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase sm:block">
                Stock
              </span>
              <span className="hidden text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase sm:block">
                MRP
              </span>
              <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                Expiry decay
              </span>
              <span className="text-right text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
                Status
              </span>
            </div>

            {/* Rows */}
            <ul className="divide-y">
              {filtered.map((item) => {
                const status = statusOf(item);
                return (
                  <li
                    key={item.medicine_id}
                    className="group grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.8fr)_80px_90px_160px_110px] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    {/* Brand */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.brand_name}
                      </p>
                      {item.dosage_form && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.dosage_form}
                        </p>
                      )}
                    </div>

                    {/* Salt */}
                    <p className="hidden truncate text-sm text-muted-foreground sm:block">
                      {item.generic_name}
                    </p>

                    {/* Stock */}
                    <p
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        item.stock_qty > 0 && item.stock_qty < 10
                          ? "font-medium text-red-600"
                          : "text-foreground",
                      )}
                    >
                      {item.stock_qty}
                    </p>

                    {/* Price */}
                    <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                      ₹{item.price.toFixed(2)}
                    </p>

                    {/* Decay chip (signature) */}
                    <DecayChip expiryDate={item.expiry_date} daysLeft={item.days_left} />

                    {/* Status */}
                    <div className="text-right">
                      <StatusBadge status={status} />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer summary */}
            <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-2.5">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                Showing {filtered.length} of {items.length} batches
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                ₹
                {filtered
                  .reduce((sum, i) => sum + i.price * i.stock_qty, 0)
                  .toLocaleString("en-IN", { maximumFractionDigits: 0 })}{" "}
                total catalog value
              </span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
