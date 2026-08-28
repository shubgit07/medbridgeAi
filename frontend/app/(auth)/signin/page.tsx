"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import API from "@/lib/api";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emitAuthChange } from "@/hooks/useAuth";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });
      const token = res.data.accessToken || res.data.access_token;
      localStorage.setItem("token", token);
      if (res.data.user?.name) {
        localStorage.setItem("pharmacy_name", res.data.user.name);
      }
      emitAuthChange();
      router.push("/dashboard");
    } catch (err) {
      const resp = err as { response?: { data?: { error?: string; detail?: string; message?: string } } };
      setError(
        resp.response?.data?.error ||
          resp.response?.data?.detail ||
          resp.response?.data?.message ||
          "Login failed. Please check your credentials and try again.",
      );
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Stop medicine waste. Recover dead stock."
      subcopy="Pharmacies discard thousands in expiring medicines while nearby stores face shortages. MedBridge matches local pharmacies to trade near-expiry stock at automated discounts before it goes to waste."
      features={[
        "Liquidate expiring stock within 10 km",
        "Automated dynamic discounts up to 75% off",
        "Verified Form 20/21 pharmacy network",
        "Direct delivery with Form 19 invoices",
      ]}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--mb-ink)]">
            Sign in to your pharmacy
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to access the exchange.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate={false} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signin-email">Email address</Label>
            <Input
              id="signin-email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="pharmacy@store.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signin-password">Password</Label>
            <div className="relative">
              <Input
                id="signin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                spellCheck={false}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-[var(--mb-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Register your pharmacy
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
