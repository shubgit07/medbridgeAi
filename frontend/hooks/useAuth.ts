"use client";

import { useSyncExternalStore } from "react";

const AUTH_EVENT = "medbridge-auth";

export interface AuthSnapshot {
  isLoggedIn: boolean;
  pharmacyName: string;
}

let authCache: AuthSnapshot = { isLoggedIn: false, pharmacyName: "" };
let authCacheToken: string | null | undefined;

function readAuth(): AuthSnapshot {
  const token = localStorage.getItem("token");
  if (token !== authCacheToken) {
    authCacheToken = token;
    authCache = {
      isLoggedIn: !!token,
      pharmacyName: localStorage.getItem("pharmacy_name") || "",
    };
  }
  return authCache;
}

function subscribeAuth(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
}

/** Stable server snapshot — must be a cached object or React loops. */
const SERVER_SNAPSHOT: AuthSnapshot = { isLoggedIn: false, pharmacyName: "" };

/** Reads the JWT session from localStorage reactively. */
export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribeAuth, readAuth, () => SERVER_SNAPSHOT);
}

/** Notifies all listeners that localStorage auth state changed. */
export function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}
