"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Radio } from "lucide-react";
import API from "@/lib/api";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let socket: WebSocket | undefined;
    let cancelled = false;
    const token = localStorage.getItem("token");
    if (!token) return;

    API.get("/notifications").then((response) => {
      if (!cancelled && Array.isArray(response.data?.notifications)) setItems(response.data.notifications);
    }).catch(() => undefined);

    API.get("/auth/me").then((response) => {
      const pharmacyId = response.data?.user?.pharmacy?.id;
      if (!pharmacyId || cancelled) return;
      const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const socketBase = base.replace(/^http/, "ws");
      socket = new WebSocket(`${socketBase}/ws/notifications?pharmacyId=${encodeURIComponent(pharmacyId)}&token=${encodeURIComponent(token)}`);
      socket.onopen = () => setLive(true);
      socket.onclose = () => setLive(false);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { type?: string; payload?: NotificationItem };
          if (message.type !== "notification" || !message.payload?.id) return;
          setItems((current) => [message.payload as NotificationItem, ...current.filter((item) => item.id !== message.payload?.id)].slice(0, 50));
        } catch {
          // Ignore malformed frames from a disconnected or outdated client.
        }
      };
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, []);

  const unread = items.filter((item) => !item.isRead).length;
  const markRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
    await API.patch(`/notifications/${item.id}/read`).catch(() => undefined);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-brand" aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute top-11 right-0 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Radio className={cn("size-3", live ? "text-emerald-600" : "text-muted-foreground")} aria-hidden="true" />
                {live ? "Live updates enabled" : "Checking live connection"}
              </p>
            </div>
            {unread > 0 && <span className="font-mono text-[11px] text-brand">{unread} new</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : items.map((item) => (
              <button key={item.id} type="button" onClick={() => void markRead(item)} className={cn("w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60", !item.isRead && "bg-brand-tint/60")}>
                <div className="flex items-start gap-2.5">
                  <span className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full", item.isRead ? "bg-muted text-muted-foreground" : "bg-brand text-white")}>
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.body}</span>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
