"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Minus,
  PackageSearch,
  PiggyBank,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import API from "@/lib/api";
import DecayChip from "@/components/decay-chip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface ListingItem {
  id: string;
  brandName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  daysLeft: number;
  quantity: number;
  unit: string;
  mrp: number;
  askingPrice: number;
  discountPct: number;
  sellerName: string;
  isVerified: boolean;
}

interface CartItem {
  listingId: string;
  brandName: string;
  batchNumber: string;
  askingPrice: number;
  mrp: number;
  unit: string;
  orderQty: number;
  maxQuantity: number;
}

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GRID =
  "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_170px_80px_minmax(0,1.5fr)_170px] items-center gap-4";

export default function MarketplacePage() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [expWin, setExpWin] = useState<30 | 60 | 90 | null>(null);
  const [rowQty, setRowQty] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  /* ── Data ── */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    API.get("/listings")
      .then((res) => {
        if (cancelled) return;
        const raw = res.data.listings;
        if (!Array.isArray(raw)) {
          setListings([]);
          return;
        }
        const now = Date.now();
        setListings(
          raw.map((item: Record<string, unknown>) => {
            const exp = new Date(item.expiryDate as string);
            return {
              id: String(item.id),
              brandName:
                ((item.drug as Record<string, unknown>)?.brandName as string) ??
                (item.brandName as string) ??
                "Medicine stock",
              genericName:
                ((item.drug as Record<string, unknown>)?.saltName as string) ??
                (item.genericName as string) ??
                "",
              batchNumber: (item.batchNumber as string) ?? "—",
              expiryDate: item.expiryDate as string,
              daysLeft: Math.max(0, Math.ceil((exp.getTime() - now) / 86_400_000)),
              quantity: typeof item.quantity === "number" ? item.quantity : 0,
              unit: "Strip",
              mrp: Number.parseFloat((item.mrp as string) ?? "0") || 0,
              askingPrice: Number.parseFloat((item.askingPrice as string) ?? "0") || 0,
              discountPct: Number.parseFloat((item.discountPct as string) ?? "0") || 0,
              sellerName:
                ((item.pharmacy as Record<string, unknown>)?.name as string) ??
                "Licensed Pharmacy",
              isVerified:
                ((item.pharmacy as Record<string, unknown>)?.isVerified as boolean) ??
                false,
            };
          }),
        );
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
  }, [reloadKey]);

  const retry = () => {
    setFetchFailed(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  /* ── Filtering ── */
  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((b) => {
      if (
        q &&
        !b.brandName.toLowerCase().includes(q) &&
        !b.genericName.toLowerCase().includes(q)
      )
        return false;
      if (expWin !== null && b.daysLeft > expWin) return false;
      return true;
    });
  }, [listings, search, expWin]);

  /* ── Cart ── */
  const getQty = (id: string, maxQuantity: number) => Math.min(maxQuantity, Math.max(1, Number(rowQty[id] ?? "1")));

  const addToCart = (item: ListingItem) => {
    const qty = getQty(item.id, item.quantity);
    setCartOpen(true);
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        listingId: item.id,
        brandName: item.brandName,
        batchNumber: item.batchNumber,
        askingPrice: item.askingPrice,
        mrp: item.mrp,
        unit: item.unit,
        orderQty: qty,
        maxQuantity: item.quantity,
      },
    }));
  };

  const updateCartQty = (id: string, qty: number) => {
    const item = cart[id];
    if (qty < 1) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setCart((prev) => ({ ...prev, [id]: { ...prev[id], orderQty: Math.min(qty, item?.maxQuantity || qty) } }));
    }
  };

  const cartItems = Object.values(cart);
  const totalAsking = cartItems.reduce((s, i) => s + i.askingPrice * i.orderQty, 0);
  const totalMrp = cartItems.reduce((s, i) => s + i.mrp * i.orderQty, 0);
  const totalSavings = totalMrp - totalAsking;
  const savingsPct = totalMrp > 0 ? Math.round((totalSavings / totalMrp) * 100) : 0;

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setOrderSubmitting(true);
    setOrderError("");
    try {
      for (const item of cartItems) {
        await API.post("/orders", {
          listingId: item.listingId,
          quantity: item.orderQty,
          pickupType: "direct_delivery",
        });
      }
      setOrderSuccess(true);
      setCart({});
    } catch {
      setOrderError(
        "Order placement failed — the exchange service didn't respond. Your draft is preserved; please retry.",
      );
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="fade-in flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
            <Store className="size-3.5" aria-hidden="true" />
            Near-expiry exchange
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Licensed B2B network · Direct delivery &amp; pay on delivery.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 font-mono text-[11px] font-medium text-green-700 ring-1 ring-green-600/20 sm:inline-flex">
            <span className="size-1.5 rounded-full bg-green-500" aria-hidden="true" />
            Active exchange
          </span>
          <Button
            variant="outline"
            onClick={() => setCartOpen(true)}
            aria-label={`Open order draft, ${cartItems.length} item${cartItems.length !== 1 ? "s" : ""}`}
            className="relative"
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            Order draft
            {cartItems.length > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand font-mono text-[10px] font-semibold text-white tabular-nums"
                aria-hidden="true"
              >
                {cartItems.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Fetch error */}
      {fetchFailed && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3"
        >
          <div className="flex items-center gap-2.5 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Couldn&apos;t load live exchange listings.
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

      {/* Filter toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Input
            id="marketplace-search-input"
            name="marketplaceSearch"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search brand or salt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search near-expiry stock"
            className="h-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {([30, 60, 90] as const).map((w) => {
            const selected = expWin === w;
            return (
              <button
                key={w}
                type="button"
                aria-pressed={selected}
                onClick={() => setExpWin(selected ? null : w)}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-mono text-xs transition-colors outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand",
                  selected
                    ? "border-[var(--mb-ink)] bg-[var(--mb-ink)] text-white"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                &lt;{w}d
              </button>
            );
          })}
        </div>

        {!loading && !fetchFailed && (
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {filteredListings.length} of {listings.length} batches
          </span>
        )}
      </div>

      {/* Listings table */}
      <Card className="mt-5 overflow-x-auto p-0">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn(GRID, "min-w-[920px] px-6 py-4")}>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <PackageSearch className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              {listings.length === 0
                ? "No active listings yet"
                : "No batches match your filters"}
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {listings.length === 0
                ? "Be the first to list near-expiry stock and recover its value."
                : "Try clearing the search or expiry window filters."}
            </p>
            {(search || expWin !== null) && listings.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setExpWin(null);
                }}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className={cn(GRID, "min-w-[920px] border-b bg-muted/50 px-6 py-2.5")}>
              {["Medicine item", "Batch & vendor", "Expiry decay", "Stock", "Price & discount", ""].map(
                (h, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase"
                  >
                    {h}
                  </span>
                ),
              )}
            </div>

            {/* Rows */}
            <ul className="min-w-[920px] divide-y">
              {filteredListings.map((item) => {
                const inCart = Boolean(cart[item.id]);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      GRID,
                      "px-6 py-3.5 transition-colors hover:bg-muted/40",
                      inCart && "bg-green-50/40",
                    )}
                  >
                    {/* Item */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.brandName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.genericName}
                      </p>
                    </div>

                    {/* Batch & vendor */}
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium text-foreground">
                        {item.batchNumber}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {item.isVerified && (
                          <BadgeCheck
                            className="size-3.5 shrink-0 text-green-600"
                            aria-label="Verified seller"
                          />
                        )}
                        <span className="truncate">{item.sellerName}</span>
                      </p>
                    </div>

                    {/* Decay chip */}
                    <DecayChip expiryDate={item.expiryDate} daysLeft={item.daysLeft} />

                    {/* Stock */}
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {item.quantity}
                    </p>

                    {/* Price */}
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {fmt(item.askingPrice)}
                        <span className="text-xs font-normal text-muted-foreground">
                          /{item.unit.toLowerCase()}
                        </span>
                      </p>
                      <p className="font-mono text-[11px] tabular-nums">
                        <span className="text-muted-foreground line-through">
                          {fmt(item.mrp)}
                        </span>{" "}
                        <span className="font-medium text-green-700">
                          {item.discountPct}% off
                        </span>
                      </p>
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-end gap-2">
                      <label htmlFor={`row-qty-${item.id}`} className="sr-only">
                        Quantity for {item.brandName}
                      </label>
                      <Input
                        id={`row-qty-${item.id}`}
                        type="number"
                        min={1}
                        max={item.quantity || undefined}
                        value={rowQty[item.id] ?? "1"}
                        onChange={(e) =>
                          setRowQty((p) => ({ ...p, [item.id]: e.target.value }))
                        }
                        className="h-8 w-14 text-center font-mono text-xs tabular-nums"
                      />
                      <Button
                        size="sm"
                        variant={inCart ? "secondary" : "default"}
                        onClick={() => addToCart(item)}
                        aria-label={
                          inCart
                            ? `Update ${item.brandName} in order draft`
                            : `Add ${item.brandName} to order draft`
                        }
                        className={cn(
                          "h-8 gap-1 px-2.5 text-xs",
                          inCart && "bg-green-600 text-white hover:bg-green-700",
                          !inCart && "bg-brand hover:bg-brand-strong",
                        )}
                      >
                        {inCart ? (
                          <>
                            <CheckIcon /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="size-3.5" aria-hidden="true" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Cart drawer */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cartItems}
        onUpdateQty={updateCartQty}
        onClear={() => setCart({})}
        totalAsking={totalAsking}
        totalMrp={totalMrp}
        totalSavings={totalSavings}
        savingsPct={savingsPct}
        onSubmit={handlePlaceOrder}
        submitting={orderSubmitting}
        success={orderSuccess}
        error={orderError}
        onDismissSuccess={() => {
          setOrderSuccess(false);
          setOrderError("");
        }}
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onUpdateQty: (id: string, qty: number) => void;
  onClear: () => void;
  totalAsking: number;
  totalMrp: number;
  totalSavings: number;
  savingsPct: number;
  onSubmit: () => void;
  submitting: boolean;
  success: boolean;
  error: string;
  onDismissSuccess: () => void;
}

function CartSheet({
  open,
  onOpenChange,
  items,
  onUpdateQty,
  onClear,
  totalAsking,
  totalMrp,
  totalSavings,
  savingsPct,
  onSubmit,
  submitting,
  success,
  error,
  onDismissSuccess,
}: CartSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Order draft
              {items.length > 0 && (
                <span className="rounded-full bg-[var(--mb-ink)] px-2 py-0.5 font-mono text-[11px] text-white tabular-nums">
                  {items.length}
                </span>
              )}
            </span>
            {items.length > 0 && !success && (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 text-xs font-normal font-medium text-destructive transition-colors hover:text-destructive/80 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Clear
              </button>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {success ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-600/20">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Order placed — pay on delivery
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Sellers will confirm shortly. Fulfillment via direct pharmacy delivery.
              </p>
              <Button variant="outline" onClick={onDismissSuccess} className="mt-6">
                Start a new order
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ShoppingCart className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                Your order draft is empty
              </h3>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Add near-expiry batches from the exchange to start building an order.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.listingId} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.brandName}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs tabular-nums text-muted-foreground">
                      {item.batchNumber} · {fmt(item.askingPrice)}/
                      {item.unit.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Decrease ${item.brandName} quantity`}
                      onClick={() => onUpdateQty(item.listingId, item.orderQty - 1)}
                      className="size-7"
                    >
                      <Minus className="size-3.5" aria-hidden="true" />
                    </Button>
                    <span className="w-7 text-center font-mono text-sm font-medium tabular-nums">
                      {item.orderQty}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Increase ${item.brandName} quantity`}
                      onClick={() => onUpdateQty(item.listingId, item.orderQty + 1)}
                      className="size-7"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="w-20 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                    {fmt(item.askingPrice * item.orderQty)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkout footer */}
        {items.length > 0 && !success && (
          <div className="border-t bg-muted/30 px-5 py-4" aria-live="polite">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total MRP value</span>
                <span className="line-through tabular-nums">{fmt(totalMrp)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-foreground">
                <span>Total payable</span>
                <span className="font-mono tabular-nums">{fmt(totalAsking)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950/40">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                    <PiggyBank className="size-3.5" aria-hidden="true" />
                    Recovered savings
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-green-700 dark:text-green-400">
                    {fmt(totalSavings)} ({savingsPct}% off)
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}

            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="mt-3 w-full bg-brand hover:bg-brand-strong"
            >
              {submitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {submitting ? "Placing order…" : "Place order (pay on delivery)"}
            </Button>

            <Separator className="my-3" />

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Banknote className="size-3.5" aria-hidden="true" /> Pay on delivery
              </span>
              <span className="flex items-center gap-1">
                <FileText className="size-3.5" aria-hidden="true" /> Form 19 invoice required
                at delivery
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
