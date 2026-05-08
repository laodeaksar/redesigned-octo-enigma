// =============================================================================
// Service Worker — handles Web Push notifications for My Ecommerce
// =============================================================================

const STATUS_LABELS = {
  pending_payment: "Menunggu Pembayaran",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refund_requested: "Minta Refund",
  refunded: "Direfund",
};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {}

  const title = data.title ?? "My Ecommerce";
  const body = data.body ?? "Status pesanan kamu telah diperbarui.";
  const url = data.url ?? "/orders";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.orderId ? `order-${data.orderId}` : "order-update",
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/orders";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find(
          (c) => c.url.includes(url) && "focus" in c
        );
        if (existing) {
          return existing.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});
