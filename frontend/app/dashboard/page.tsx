"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  CircleAlert,
  PackagePlus,
  ScanLine,
  Search,
  Store,
} from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import DecayChip from "@/components/decay-chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InventoryItem {
  medicine_id: number;
  brand_name: string;
  generic_name?: string;
  stock_qty: number;
  expiry_date: string;
  price: number;
  days_left: number;
}

interface OrderRow {
  id: string;
  status: string;
  quantity: number;
  createdAt?: string;
  listing?: {
    drug?: { brandName?: string; saltName?: string } | null;
  } | null;
}

const QUICK_ACTIONS = [
  { href: "/scan", icon: ScanLine, title: "Scan new batch", description: "AI label extraction" },
  { href: "/marketplace", icon: Store, title: "Browse marketplace", description: "Live near-expiry exchange" },
  { href: "/search", icon: Search, title: "Search substitutes", description: "Salts, brands, fuzzy match" },
];

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/25",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  delivered: "bg-green-50 text-green-700 ring-green-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
};

const fmtINR = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function Dashboard() {
  const router = useRouter();
  const { isLoggedIn, pharmacyName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
      return;
    }

    let cancelled = false;

    API.get("/inventory")
      .then((res) => {
        if (!cancelled && Array.isArray(res.data)) setItems(res.data);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    API.get("/orders")
      .then((res) => {
        const list = res.data?.orders;
        if (!cancelled && Array.isArray(list)) {
          setOrders([...list].sort((a: OrderRow, b: OrderRow) =>
            String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
          ).slice(0, 4));
        }
      })
      .catch(() => {
        /* Orders are supplementary - dashboard stays useful without them */
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

  /* Value-at-risk math (computed from real inventory rows) */
  const risk = useMemo(() => {
    let totalValue = 0;
    let atRiskValue = 0;
    let atRiskBatches = 0;
    for (const item of items) {
      const value = item.price * item.stock_qty;
      totalValue += value;
      if (item.days_left <= 30) {
        atRiskValue += value;
        atRiskBatches += 1;
      }
    }
    return {
      totalValue,
      atRiskValue,
      atRiskBatches,
      sharePct: totalValue > 0 ? Math.round((atRiskValue / totalValue) * 100) : 0,
    };
  }, [items]);

  const urgentBatches = useMemo(
    () =>
      [...items]
        .filter((i) => i.days_left <= 90)
        .sort((a, b) => a.days_left - b.days_left)
        .slice(0, 5),
    [items],
  );

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <header className="fade-in flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
            Pharmacy operations dashboard
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Welcome, {pharmacyName || "City Pharmacy"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>

        <Button asChild className="bg-brand hover:bg-brand-strong">
          <Link href="/scan">
            <PackagePlus className="size-4" aria-hidden="true" />
            Add stock batch
          </Link>
        </Button>
      </header>

      {/* Fetch error banner */}
      {fetchFailed && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3"
        >
          <div className="flex items-center gap-2.5 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Couldn&apos;t reach the inventory service. Figures shown may be out of date.
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

      {/* Signature: value-at-risk panel */}
      <section aria-label="Value at risk" className="mt-8">
        <Card className="p-6">
          {loading ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-11 w-56" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-16 w-full sm:w-72" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                  Catalog value expiring within 30 days
                </p>
                <p
                  className={cn(
                    "mt-2 font-mono text-5xl font-semibold leading-none tracking-tight tabular-nums",
                    risk.atRiskValue > 0 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {fmtINR(risk.atRiskValue)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  across{" "}
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {risk.atRiskBatches}
                  </span>{" "}
                  of{" "}
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {items.length}
                  </span>{" "}
                  batches · {fmtINR(risk.totalValue)} total catalog value
                </p>
              </div>

              {/* Share-of-catalog meter */}
              <div className="w-full max-w-xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">
                    Share of catalog at risk
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {risk.sharePct}%
                  </span>
                </div>
                <div
                  role="meter"
                  aria-valuenow={risk.sharePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Share of catalog value expiring within 30 days"
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      risk.sharePct > 50
                        ? "bg-red-500"
                        : risk.sharePct > 20
                          ? "bg-amber-500"
                          : "bg-brand",
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(risk.sharePct, risk.atRiskValue > 0 ? 3 : 0))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  List at-risk batches on the marketplace before they become write-offs.
                </p>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Needs action + quick actions + orders */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Needs action now */}
        <section aria-label="Batches needing action" className="lg:col-span-2">
          <h2 className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
            Needs action now
          </h2>
          <Card className="mt-3 overflow-hidden p-0">
            {loading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-1/5" />
                    </div>
                    <Skeleton className="h-7 w-36" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : urgentBatches.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-foreground">Nothing expiring soon</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  No batches within a 90-day decay window. New scans will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {urgentBatches.map((item) => (
                  <li key={item.medicine_id}>
                    <Link
                      href="/inventory"
                      className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors outline-offset-[-2px] hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-brand"
                      aria-label={`${item.brand_name}, ${item.days_left} days left — open inventory`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.brand_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.generic_name || "Medicine"} ·{" "}
                          <span className="font-mono tabular-nums">
                            {item.stock_qty} units · {fmtINR(item.price * item.stock_qty)}
                          </span>
                        </p>
                      </div>
                      <div className="hidden shrink-0 sm:block">
                        <DecayChip expiryDate={item.expiry_date} daysLeft={item.days_left} />
                      </div>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Right rail: quick actions + recent orders */}
        <div className="flex flex-col gap-6">
          <section aria-label="Quick actions">
            <h2 className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
              Quick actions
            </h2>
            <Card className="mt-3 divide-y p-0">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3.5 px-5 py-4 transition-colors outline-offset-[-2px] hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand ring-1 ring-brand/15 transition-colors group-hover:bg-brand group-hover:text-white">
                    <action.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {action.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </Card>
          </section>

          <section aria-label="Recent orders">
            <h2 className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
              Recent orders
            </h2>
            <Card className="mt-3 p-0">
              {orders === null ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {loading ? "Loading…" : "No order history available"}
                </div>
              ) : orders.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Orders you place on the marketplace appear here.
                </div>
              ) : (
                <ul className="divide-y">
                  {orders.map((order) => {
                    const drug = order.listing?.drug;
                    return (
                      <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {drug?.brandName ?? "Listing removed"}
                          </p>
                          <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                            ×{order.quantity}
                            {order.createdAt &&
                              ` · ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ring-1 ring-inset",
                            ORDER_STATUS_STYLES[order.status?.toLowerCase()] ??
                              "bg-muted text-muted-foreground ring-border",
                          )}
                        >
                          {order.status ?? "unknown"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
