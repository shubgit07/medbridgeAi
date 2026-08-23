"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Root page — routes by session:
 *  - signed in  -> /dashboard
 *  - signed out -> /signin
 * (Session lives in localStorage, so the check must run client-side.)
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    router.replace(token ? "/dashboard" : "/signin");
  }, [router]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
      <Loader2
        className="size-5 animate-spin text-muted-foreground"
        aria-label="Loading MedBridge"
      />
    </div>
  );
}
