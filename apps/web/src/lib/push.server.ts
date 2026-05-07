// =============================================================================
// Server-side Web Push helpers
// =============================================================================

import webpush from "web-push";
import { createDrizzleClient } from "@repo/database/drizzle";
import { pushSubscriptionsTable } from "@repo/database/drizzle/schema";
import { eq } from "drizzle-orm";

export const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL       = process.env.VAPID_EMAIL       ?? "mailto:support@my-ecommerce.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Singleton DB client (reused across requests in the same process)
let _db: ReturnType<typeof createDrizzleClient> | null = null;

function getDb() {
  if (!_db) {
    _db = createDrizzleClient({
      url: process.env.DATABASE_URL!,
      maxConnections: 3,
    });
  }
  return _db;
}

// ── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_payment:  "Menunggu Pembayaran",
  processing:       "Diproses",
  shipped:          "Dikirim",
  delivered:        "Terkirim",
  completed:        "Selesai",
  cancelled:        "Dibatalkan",
  refund_requested: "Minta Refund",
  refunded:         "Direfund",
};

// ── Send push notifications for an order status change ───────────────────────

export async function sendOrderStatusPush(
  orderId:      string,
  status:       string,
  orderNumber?: string | null
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const db   = getDb();
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.orderId, orderId));

  if (subs.length === 0) return;

  const label    = STATUS_LABELS[status] ?? status;
  const orderRef = orderNumber ? `Pesanan #${orderNumber}` : "Pesananmu";
  const payload  = JSON.stringify({
    title:   "Status Pesanan Diperbarui",
    body:    `${orderRef} kini berstatus: ${label}`,
    orderId,
    url:     `/orders/${orderId}`,
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Clean up expired subscriptions (HTTP 410 Gone)
  const expired = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" &&
        (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
    })
    .map((s) => s.endpoint);

  for (const endpoint of expired) {
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint))
      .catch(() => {});
  }
}

// ── Save a new push subscription ────────────────────────────────────────────

export async function savePushSubscription(opts: {
  userId:       string;
  orderId:      string;
  orderNumber?: string;
  endpoint:     string;
  p256dh:       string;
  auth:         string;
}): Promise<void> {
  const db = getDb();
  await db
    .insert(pushSubscriptionsTable)
    .values(opts)
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: {
        userId:      opts.userId,
        orderId:     opts.orderId,
        orderNumber: opts.orderNumber,
      },
    });
}

// ── Remove a push subscription ───────────────────────────────────────────────

export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = getDb();
  await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));
}
