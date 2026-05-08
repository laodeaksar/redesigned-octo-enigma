import { useEffect, useRef, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

interface Props {
  orderId: string;
  orderNumber?: string;
}

type State =
  | "idle"
  | "requesting"
  | "subscribing"
  | "subscribed"
  | "denied"
  | "unsupported";

export default function PushNotificationManager({
  orderId,
  orderNumber,
}: Props) {
  const [state, setState] = useState<State>("idle");
  const subscriptionRef = useRef<PushSubscription | null>(null);
  const hasAttemptedRef = useRef(false);

  const doSubscribe = async (swReg: ServiceWorkerRegistration) => {
    setState("subscribing");
    try {
      const res = await fetch("/api/push/vapid-public-key");
      const { publicKey } = (await res.json()) as { publicKey: string };
      if (!publicKey) {
        setState("idle");
        return;
      }

      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      subscriptionRef.current = sub;

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          orderId,
          orderNumber,
        }),
      });

      setState("subscribed");
    } catch (err) {
      console.warn("[PushManager] subscribe error:", err);
      setState("idle");
    }
  };

  useEffect(() => {
    if (hasAttemptedRef.current) {
      return;
    }
    hasAttemptedRef.current = true;

    if (!("serviceWorker" in navigator && "PushManager" in window)) {
      setState("unsupported");
      return;
    }

    // If already granted, subscribe silently on mount
    if (Notification.permission === "granted") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => navigator.serviceWorker.ready.then(() => reg))
        .then((reg) =>
          reg.pushManager.getSubscription().then((existing) => {
            if (existing) {
              subscriptionRef.current = existing;
              setState("subscribed");
            } else {
              doSubscribe(reg);
            }
          })
        )
        .catch(() => setState("idle"));
    } else if (Notification.permission === "denied") {
      setState("denied");
    }
    // else "default" — wait for user to click button
  }, []);

  const handleClick = async () => {
    if (state !== "idle") {
      return;
    }
    setState("requesting");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      await doSubscribe(reg);
    } catch {
      setState("idle");
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscriptionRef.current) {
      return;
    }
    try {
      const endpoint = subscriptionRef.current.endpoint;
      await subscriptionRef.current.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      subscriptionRef.current = null;
      setState("idle");
    } catch {
      // ignore
    }
  };

  if (state === "unsupported" || state === "denied") {
    return null;
  }

  if (state === "subscribed") {
    return (
      <button
        className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 font-medium text-green-700 text-xs transition-colors hover:bg-green-100"
        onClick={handleUnsubscribe}
        title="Matikan notifikasi untuk pesanan ini"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-2.83-2h5.66A3 3 0 0110 18z" />
        </svg>
        Notifikasi Aktif
      </button>
    );
  }

  if (state === "requesting" || state === "subscribing") {
    return (
      <span className="text-gray-400 text-xs">Menyiapkan notifikasi…</span>
    );
  }

  // idle — show enable button
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 text-xs transition-colors hover:bg-gray-50"
      onClick={handleClick}
      title="Aktifkan notifikasi push untuk mendapat update saat status pesanan berubah"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Aktifkan Notifikasi
    </button>
  );
}
