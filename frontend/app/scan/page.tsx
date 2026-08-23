"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  PackagePlus,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BarcodeScanner = dynamic(() => import("react-qr-barcode-scanner"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Loading camera interface…
    </div>
  ),
});

async function runOCR(file: File): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: { status?: string }) => console.log("OCR:", m),
  });
  return result.data.text;
}

const STEPS = ["Choose method", "Fill details", "Confirm & save"];

function StepIndicator({ current }: { current: number }) {
  return (
    <nav
      aria-label="Registration progress"
      className="mb-8 flex items-center"
    >
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div
            key={label}
            className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}
          >
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  done && "bg-green-600 text-white",
                  active && "bg-brand text-white",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  active && "font-medium text-foreground",
                  done && "text-green-700",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-5 h-0.5 flex-1 rounded-full transition-colors",
                  done ? "bg-green-500" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

interface ScanMessage {
  text: string;
  type: "error" | "info";
}

function MessageBanner({ message }: { message: ScanMessage }) {
  const isError = message.type === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
        isError
          ? "border-destructive/25 bg-destructive/5 text-destructive"
          : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>{message.text}</span>
    </div>
  );
}

interface FormState {
  brand_name: string;
  generic_name: string;
  dosage_form: string;
  manufacturer: string;
  stock_qty: string;
  expiry_date: string;
  price: string;
}

const EMPTY_FORM: FormState = {
  brand_name: "",
  generic_name: "",
  dosage_form: "",
  manufacturer: "",
  stock_qty: "",
  expiry_date: "",
  price: "",
};

export default function ScanPage() {
  const [step, setStep] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [terms, setTerms] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<ScanMessage | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const handleQR = (err: unknown, result?: { getText: () => string }) => {
    if (result) console.log("QR:", result.getText());
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setMessage(null);
    try {
      const text = await runOCR(file);
      if (!text || text.trim() === "") {
        setMessage({
          text: "No clear text detected on the label. Please enter the details manually below.",
          type: "error",
        });
        setStep(1);
        return;
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/ocr/extract-medicine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setForm((prev) => ({ ...prev, ...data.data }));
      setStep(1);
    } catch (err) {
      console.error(err);
      setMessage({
        text: "AI extraction is unavailable right now. Please complete the details manually.",
        type: "info",
      });
      setStep(1);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!terms) {
      setMessage({
        text: "Please confirm the compliance terms before publishing.",
        type: "error",
      });
      return;
    }
    setSubmitLoading(true);
    setMessage(null);
    try {
      await API.post("/listings", {
        brandName: form.brand_name,
        genericName: form.generic_name,
        dosageForm: form.dosage_form,
        manufacturer: form.manufacturer,
        quantity: Number(form.stock_qty),
        askingPrice: Number(form.price),
        mrp: Number(form.price) * 1.5,
        expiryDate: form.expiry_date,
        batchNumber: "BN-" + Math.floor(Math.random() * 89999 + 10000),
      });
      setStep(2);
    } catch {
      setMessage({
        text: "Publishing failed — the exchange service didn't respond. Your details are still filled in below; please retry.",
        type: "error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForAnotherBatch = () => {
    setForm(EMPTY_FORM);
    setTerms(false);
    setMessage(null);
    setStep(0);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Card className="fade-in p-6 sm:p-8">
        {/* Header */}
        <div className="mb-7">
          <p className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
            AI-assisted listing
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Register new stock batch
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Photograph the medicine box label and let AI fill in the details, or enter them yourself.
          </p>
        </div>

        <StepIndicator current={showQR ? 0 : step} />

        {message && <MessageBanner message={message} />}

        {/* STEP 0: Choose method */}
        {step === 0 && !showQR && (
          <div className="fade-in flex flex-col gap-4">
            {/* OCR upload */}
            <label
              htmlFor="ocr-upload"
              className={cn(
                "flex items-center gap-4 rounded-xl border-2 border-dashed p-6 transition-colors",
                ocrLoading
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:border-brand/50 hover:bg-brand-tint",
              )}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[var(--mb-ink)] text-white">
                {ocrLoading ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="size-5" aria-hidden="true" />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {ocrLoading ? "Extracting label text…" : "Upload medicine box photo"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  AI reads brand name, salt composition, batch #, and expiry date automatically
                </span>
              </span>
              <input
                id="ocr-upload"
                name="boxPhoto"
                type="file"
                accept="image/*"
                aria-label="Upload medicine box photo for AI OCR extraction"
                className="sr-only"
                onClick={(e) => {
                  e.currentTarget.value = "";
                }}
                onChange={(e) => void handleOCR(e)}
                disabled={ocrLoading}
              />
            </label>

            {/* Barcode scan */}
            <button
              id="scan-qr-btn"
              type="button"
              onClick={() => setShowQR(true)}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all outline-offset-2 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand ring-1 ring-brand/15">
                <QrCode className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  Scan GS1 / barcode
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Read the product barcode with your camera
                </span>
              </span>
            </button>

            {/* Manual entry */}
            <div className="mt-1 text-center">
              <button
                id="scan-manual-btn"
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-4 transition-colors outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
              >
                Or enter details manually
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* QR scanner */}
        {showQR && (
          <div className="fade-in text-center">
            <div className="inline-block overflow-hidden rounded-xl border border-border">
              <BarcodeScanner width={360} height={280} onUpdate={handleQR} />
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => setShowQR(false)}>
                Back to options
              </Button>
            </div>
          </div>
        )}

        {/* STEP 1: Details form */}
        {step === 1 && !showQR && (
          <div className="fade-in flex flex-col gap-6">
            {/* Medicine identity */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                Medicine identity
              </legend>
              <div className="space-y-1.5">
                <Label htmlFor="field-brand">Brand name</Label>
                <Input
                  id="field-brand"
                  name="brand_name"
                  value={form.brand_name}
                  onChange={handleChange}
                  placeholder="e.g. Paracetamol 500mg"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="field-generic">Generic salt</Label>
                <Input
                  id="field-generic"
                  name="generic_name"
                  value={form.generic_name}
                  onChange={handleChange}
                  placeholder="e.g. Paracetamol"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="field-form">Dosage form</Label>
                  <Input
                    id="field-form"
                    name="dosage_form"
                    value={form.dosage_form}
                    onChange={handleChange}
                    placeholder="Tablet / Syrup / Injection"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="field-mfg">Manufacturer</Label>
                  <Input
                    id="field-mfg"
                    name="manufacturer"
                    value={form.manufacturer}
                    onChange={handleChange}
                    placeholder="e.g. Cipla Ltd"
                  />
                </div>
              </div>
            </fieldset>

            {/* Stock & expiry */}
            <fieldset className="space-y-4 border-t pt-6">
              <legend className="text-xs font-medium tracking-[0.05em] text-muted-foreground uppercase">
                Stock &amp; expiry
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="field-qty">Quantity (strips / units)</Label>
                  <Input
                    id="field-qty"
                    name="stock_qty"
                    type="number"
                    min={1}
                    value={form.stock_qty}
                    onChange={handleChange}
                    placeholder="50"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="field-price">Asking price (₹)</Label>
                  <Input
                    id="field-price"
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="45.00"
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="field-expiry">Expiry date</Label>
                  <Input
                    id="field-expiry"
                    name="expiry_date"
                    type="date"
                    value={form.expiry_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </fieldset>

            {/* Compliance + actions */}
            <div className="flex flex-col gap-5 border-t pt-6">
              <label
                htmlFor="chk-terms"
                className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <input
                  type="checkbox"
                  id="chk-terms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--mb-teal)]"
                />
                <span>
                  I confirm that drug license{" "}
                  <span className="font-mono text-xs">Form 20/21</span> compliance terms are
                  satisfied for this batch.
                </span>
              </label>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  disabled={submitLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  id="scan-submit-btn"
                  onClick={() => void submit()}
                  disabled={submitLoading}
                  className="flex-[2] bg-brand hover:bg-brand-strong"
                >
                  {submitLoading && (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  )}
                  {submitLoading ? "Publishing…" : "Publish stock listing"}
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* STEP 2: Published confirmation */}
        {step === 2 && (
          <div className="fade-in flex flex-col items-center py-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-green-600/20">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Batch published to the exchange
            </h2>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{form.brand_name}</span>{" "}
              is now live for verified pharmacies within matching distance.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={resetForAnotherBatch}>
                <PackagePlus className="size-4" aria-hidden="true" />
                Add another batch
              </Button>
              <Button asChild className="bg-brand hover:bg-brand-strong">
                <Link href="/marketplace">
                  View in marketplace
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
