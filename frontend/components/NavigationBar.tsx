"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LogOut, Menu, PackagePlus, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { emitAuthChange, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/NotificationCenter";

const NAV_LINKS = [
  { href: "/search", label: "Medicine Search", auth: false },
  { href: "/marketplace", label: "Marketplace", auth: false },
  { href: "/inventory", label: "My Inventory", auth: true },
  { href: "/dashboard", label: "Dashboard", auth: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, pharmacyName } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("pharmacy_name");
    emitAuthChange();
    setMenuOpen(false);
    router.push("/signin");
  }, [router]);

  const visibleLinks = NAV_LINKS.filter((l) => !l.auth || isLoggedIn);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--mb-ink)] text-white shadow-sm">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        {/* Brand */}
        <Link
          href="/"
          aria-label="MedBridge home"
          className="flex shrink-0 items-center gap-2.5 rounded-md outline-offset-4 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand">
            <Pill className="size-4.5 text-white" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            MedBridge
          </span>
          {pharmacyName && (
            <span className="hidden max-w-40 truncate text-sm font-normal text-white/60 md:inline">
              / {pharmacyName}
            </span>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm transition-colors outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand",
                  active
                    ? "font-medium text-white after:absolute after:-bottom-[13px] after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-brand"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isLoggedIn ? (
            <>
              <NotificationCenter />
              <Button
                size="sm"
                onClick={() => router.push("/scan")}
                className="hidden bg-white text-[var(--mb-ink)] hover:bg-white/90 sm:inline-flex"
              >
                <PackagePlus className="size-4" aria-hidden="true" />
                Add Stock
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Sign out"
                onClick={handleLogout}
                className="hidden size-8 text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/signin")}
                className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Sign in
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/signup")}
                className="hidden bg-white text-[var(--mb-ink)] hover:bg-white/90 sm:inline-flex"
              >
                Sign up
              </Button>
            </>
          )}

          {/* Mobile trigger */}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="size-9 text-white hover:bg-white/10 md:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="right"
          className="w-72 border-white/10 bg-[var(--mb-ink)] text-white [&>button]:text-white/70"
        >
          <SheetHeader className="border-b border-white/10 text-left">
            <SheetTitle className="flex items-center gap-2.5 text-white">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand">
                <Pill className="size-4.5" aria-hidden="true" />
              </span>
              MedBridge
              {pharmacyName && (
                <span className="truncate text-xs font-normal text-white/60">
                  / {pharmacyName}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 px-3 pt-2">
            {visibleLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-white/10 font-medium text-white"
                      : "text-white/65 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
              {isLoggedIn ? (
                <>
                  <Link href="/scan" onClick={() => setMenuOpen(false)}>
                    <Button className="w-full bg-brand hover:bg-brand-strong">
                      <PackagePlus className="size-4" aria-hidden="true" />
                      Add Stock
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full border-white/15 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/signin" onClick={() => setMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="w-full border-white/15 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)}>
                    <Button className="w-full bg-brand hover:bg-brand-strong">
                      Sign up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
