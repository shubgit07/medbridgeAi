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

interface SignupForm {
  name: string;
  email: string;
  password: string;
}

const EMPTY_FORM: SignupForm = { name: "", email: "", password: "" };

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/signup", form);
      const token = res.data.accessToken || res.data.user_id;
      if (token) localStorage.setItem("token", token);
      localStorage.setItem("pharmacy_name", form.name.trim());
      router.push("/dashboard");
    } catch (err) {
      const resp = err as { response?: { data?: { error?: string; detail?: string; message?: string } } };
      setError(
        resp.response?.data?.error ||
          resp.response?.data?.detail ||
          resp.response?.data?.message ||
          "Signup failed. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Join the B2B pharmacy network"
      subcopy="Register your licensed pharmacy to list near-expiry medicines, find generic salt substitutes, and buy at discounted prices."
      features={[
        "Form 20/21 license verification",
        "Direct delivery between pharmacies",
        "Pay on delivery",
        "Free registration",
      ]}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--mb-ink)]">
            Register your pharmacy
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account to start trading near-expiry stock.
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

        <form onSubmit={signup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">Pharmacy name</Label>
            <Input
              id="signup-name"
              name="name"
              autoComplete="organization"
              placeholder="e.g. City Retail Pharmacy"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email address</Label>
            <Input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@pharmacy.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                spellCheck={false}
                placeholder="Create a secure password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                required
                minLength={6}
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
            <p className="text-xs text-muted-foreground/70">
              Minimum 6 characters.
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-strong">
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? "Creating account…" : "Complete registration"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/signin"
            className="font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
