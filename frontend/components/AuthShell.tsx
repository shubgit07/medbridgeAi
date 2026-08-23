import Link from "next/link";
import { Check, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  headline: string;
  subcopy: string;
  features: string[];
  children: React.ReactNode;
}

export default function AuthShell({
  headline,
  subcopy,
  features,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-[calc(100vh-64px)] bg-canvas-wash lg:grid-cols-[1fr_1.1fr]">
      {/* Editorial panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[var(--mb-ink)] p-10 text-white lg:flex xl:p-14">
        {/* Ambient brand glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-brand/20 blur-3xl"
        />

        <Link
          href="/"
          className="relative z-10 flex items-center gap-2.5 rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand"
          aria-label="MedBridge home"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand">
            <Pill className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">MedBridge</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            {headline}
          </h1>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-white/65">
            {subcopy}
          </p>

          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/25">
                  <Check className="size-3 text-brand-tint" aria-hidden="true" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          Licensed B2B exchange · Form 20/21 verified pharmacies only
        </p>
      </aside>

      {/* Form panel */}
      <main
        id="main-content"
        className={cn(
          "flex flex-col items-center justify-center px-4 py-12 sm:px-8",
        )}
      >
        {children}
      </main>
    </div>
  );
}
