import { redirect } from "next/navigation";

/**
 * Root page — redirects to the Marketplace.
 * This is a Server Component (no "use client") so the redirect
 * happens before any JS is sent to the browser: zero flash.
 */
export default function RootPage() {
  redirect("/marketplace");
}
