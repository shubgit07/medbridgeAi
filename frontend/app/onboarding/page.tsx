"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { LocateFixed, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const INITIAL = {
  name: "", ownerName: "", phone: "", email: "", address: "", city: "", pincode: "",
  latitude: "", longitude: "", drugLicenseNo: "", licenseType: "Form20", licenseScanUrl: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) router.replace("/signin");
  }, [isLoggedIn, router]);

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const locate = () => {
    if (!navigator.geolocation) return setError("Location access is not available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => { setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) })); setLocating(false); },
      () => { setError("Location access was denied. Enter your pharmacy coordinates manually."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      await API.post("/pharmacies", { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) });
      router.push("/dashboard");
    } catch (cause) {
      const response = cause as { response?: { data?: { error?: string } } };
      setError(response.response?.data?.error || "We could not submit the pharmacy profile. Check the fields and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Card className="fade-in p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-brand"><ShieldCheck className="size-4" aria-hidden="true" /> Pharmacy verification</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Set up your pharmacy profile</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your profile and license are reviewed before you can list or purchase stock on the exchange.</p>
        </div>
        {error && <p role="alert" className="mt-6 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
        <form onSubmit={submit} className="mt-8 space-y-6">
          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="col-span-full mb-1 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">Business details</legend>
            {[["name", "Pharmacy name", "City Care Pharmacy"], ["ownerName", "Owner name", "Full legal name"], ["phone", "Phone number", "+91 98765 43210"], ["email", "Business email", "pharmacy@example.com"], ["address", "Street address", "Registered pharmacy address"], ["city", "City", "Bengaluru"]].map(([name, label, placeholder]) => (
              <div key={name} className={name === "address" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                <Label htmlFor={`onboard-${name}`}>{label}</Label>
                <Input id={`onboard-${name}`} name={name} type={name === "email" ? "email" : "text"} value={form[name as keyof typeof form]} onChange={update} placeholder={placeholder} required />
              </div>
            ))}
            <div className="space-y-1.5"><Label htmlFor="onboard-pincode">Pincode</Label><Input id="onboard-pincode" name="pincode" value={form.pincode} onChange={update} placeholder="560001" required /></div>
          </fieldset>
          <fieldset className="grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2">
            <legend className="col-span-full mb-1 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">Exchange location</legend>
            <div className="space-y-1.5"><Label htmlFor="onboard-latitude">Latitude</Label><Input id="onboard-latitude" name="latitude" type="number" step="any" value={form.latitude} onChange={update} placeholder="12.9716" required /></div>
            <div className="space-y-1.5"><Label htmlFor="onboard-longitude">Longitude</Label><Input id="onboard-longitude" name="longitude" type="number" step="any" value={form.longitude} onChange={update} placeholder="77.5946" required /></div>
            <Button type="button" variant="outline" onClick={locate} disabled={locating} className="w-fit"><LocateFixed className="size-4" aria-hidden="true" />{locating ? "Locating..." : "Use current location"}</Button>
          </fieldset>
          <fieldset className="grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2">
            <legend className="col-span-full mb-1 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">License evidence</legend>
            <div className="space-y-1.5"><Label htmlFor="onboard-license">Drug license number</Label><Input id="onboard-license" name="drugLicenseNo" value={form.drugLicenseNo} onChange={update} placeholder="DL-KA-2026-0001" required /></div>
            <div className="space-y-1.5"><Label htmlFor="onboard-type">License type</Label><select id="onboard-type" name="licenseType" value={form.licenseType} onChange={update} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="Form20">Form 20</option><option value="Form21">Form 21</option></select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="onboard-scan">License scan URL</Label><Input id="onboard-scan" name="licenseScanUrl" type="url" value={form.licenseScanUrl} onChange={update} placeholder="https://storage.example.com/license.pdf" required /><p className="text-xs text-muted-foreground">Upload the scan to your storage provider, then paste its secure URL here.</p></div>
          </fieldset>
          <Button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-strong sm:w-auto">{loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{loading ? "Submitting profile..." : "Submit for verification"}</Button>
        </form>
      </Card>
    </div>
  );
}
