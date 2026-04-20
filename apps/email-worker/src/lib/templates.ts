// =============================================================================
// Email templates
// Minimal inline-CSS HTML templates — works in all email clients.
// All amounts in IDR. All templates are mobile-responsive.
// =============================================================================

import { env } from "@/config";

// ── Design tokens ─────────────────────────────────────────────────────────────

const COLORS = {
  brand: "#1a1a2e",
  accent: "#e94560",
  text: "#333333",
  muted: "#666666",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
} as const;

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Base layout ───────────────────────────────────────────────────────────────

function baseLayout(title: string, content: string): string {
  const appUrl = env.NODE_ENV === "production"
    ? "https://my-ecommerce.com"
    : "http://localhost:3010";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.white};border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

          <!-- Header -->
          <tr>
            <td style="background:${COLORS.brand};padding:24px 32px;">
              <a href="${appUrl}" style="text-decoration:none;">
                <span style="color:${COLORS.white};font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                  🛒 My Ecommerce
                </span>
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;color:${COLORS.text};font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${COLORS.bg};padding:24px 32px;border-top:1px solid ${COLORS.border};">
              <p style="margin:0;font-size:12px;color:${COLORS.muted};text-align:center;">
                Email ini dikirim secara otomatis. Jangan balas email ini.<br/>
                &copy; ${new Date().getFullYear()} My Ecommerce. Hak cipta dilindungi.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Component helpers ─────────────────────────────────────────────────────────

function button(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${COLORS.accent};border-radius:6px;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:${COLORS.white};font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0;" />`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:${COLORS.muted};font-size:14px;width:45%;">${label}</td>
    <td style="padding:8px 0;color:${COLORS.text};font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}

function orderItemRow(item: {
  name: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};">
      <p style="margin:0;font-size:14px;font-weight:500;color:${COLORS.text};">${item.name}</p>
      <p style="margin:2px 0 0;font-size:12px;color:${COLORS.muted};">${item.variantName} × ${item.quantity}</p>
    </td>
    <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};text-align:right;font-size:14px;color:${COLORS.text};">
      ${formatIDR(item.subtotal)}
    </td>
  </tr>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

// 1. Welcome email ─────────────────────────────────────────────────────────────

export interface WelcomePayload {
  name: string;
  email: string;
}

export function welcomeTemplate(payload: WelcomePayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Selamat datang di My Ecommerce, ${payload.name}! 🎉`;

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;color:${COLORS.brand};">Hei, ${payload.name}! 👋</h1>
    <p style="margin:0 0 16px;color:${COLORS.muted};">Selamat bergabung dengan My Ecommerce.</p>
    <p>Akun kamu sudah aktif dengan email <strong>${payload.email}</strong>. Kamu bisa mulai belanja sekarang atau lengkapi profilmu terlebih dahulu.</p>

    ${button("Mulai Belanja", "http://localhost:3010/products")}

    ${divider()}

    <p style="font-size:13px;color:${COLORS.muted};">
      Ada pertanyaan? Balas email ini atau hubungi tim support kami di
      <a href="mailto:support@my-ecommerce.com" style="color:${COLORS.accent};">support@my-ecommerce.com</a>
    </p>
  `;

  const text = `Hei ${payload.name},\n\nSelamat bergabung dengan My Ecommerce!\nAkun kamu aktif dengan email: ${payload.email}\n\nMulai belanja: http://localhost:3010/products`;

  return { subject, html: baseLayout(subject, content), text };
}

// 2. Order confirmation ────────────────────────────────────────────────────────

export interface OrderConfirmationItem {
  name: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderConfirmationPayload {
  orderNumber: string;
  email: string;
  items: OrderConfirmationItem[];
  pricing: {
    subtotal: number;
    shippingCost: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  };
  shipping: {
    courier: string;
    service: string;
    address: {
      recipientName: string;
      phone: string;
      street: string;
      city: string;
      province: string;
      postalCode: string;
    };
  };
  expiresAt: string;
}

export function orderConfirmationTemplate(p: OrderConfirmationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Pesanan ${p.orderNumber} Menunggu Pembayaran`;

  const itemRows = p.items.map(orderItemRow).join("");

  const summaryRows = [
    infoRow("Subtotal", formatIDR(p.pricing.subtotal)),
    p.pricing.discountTotal > 0
      ? infoRow("Diskon", `- ${formatIDR(p.pricing.discountTotal)}`)
      : "",
    infoRow("Ongkir", formatIDR(p.pricing.shippingCost)),
    p.pricing.taxTotal > 0
      ? infoRow("Pajak", formatIDR(p.pricing.taxTotal))
      : "",
  ]
    .filter(Boolean)
    .join("");

  const addr = p.shipping.address;

  const content = `
    <h1 style="margin:0 0 4px;font-size:22px;color:${COLORS.brand};">Pesanan Berhasil Dibuat ✅</h1>
    <p style="margin:0 0 24px;color:${COLORS.muted};">Nomor pesanan: <strong>${p.orderNumber}</strong></p>

    <p>Selesaikan pembayaran sebelum <strong>${formatDate(p.expiresAt)}</strong> agar pesanan kamu tidak dibatalkan otomatis.</p>

    ${button("Bayar Sekarang", `http://localhost:3010/orders/${p.orderNumber}/pay`)}

    ${divider()}

    <h2 style="font-size:16px;margin:0 0 16px;color:${COLORS.brand};">Ringkasan Pesanan</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${itemRows}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      ${summaryRows}
      <tr>
        <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:${COLORS.brand};border-top:2px solid ${COLORS.border};">Total</td>
        <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:${COLORS.accent};border-top:2px solid ${COLORS.border};">${formatIDR(p.pricing.grandTotal)}</td>
      </tr>
    </table>

    ${divider()}

    <h2 style="font-size:16px;margin:0 0 12px;color:${COLORS.brand};">Alamat Pengiriman</h2>
    <p style="margin:0;font-size:14px;line-height:1.8;">
      <strong>${addr.recipientName}</strong> · ${addr.phone}<br/>
      ${addr.street}<br/>
      ${addr.city}, ${addr.province} ${addr.postalCode}
    </p>
    <p style="margin:8px 0 0;font-size:13px;color:${COLORS.muted};">
      Kurir: <strong>${p.shipping.courier.toUpperCase()}</strong> ${p.shipping.service}
    </p>
  `;

  const text = `Pesanan ${p.orderNumber} berhasil dibuat.\nTotal: ${formatIDR(p.pricing.grandTotal)}\nBayar sebelum: ${formatDate(p.expiresAt)}\nBayar di: http://localhost:3010/orders/${p.orderNumber}/pay`;

  return { subject, html: baseLayout(subject, content), text };
}

// 3. Order shipped ─────────────────────────────────────────────────────────────

export interface OrderShippedPayload {
  orderNumber: string;
  email: string;
  courier: string;
  trackingNumber: string | null;
  address: {
    recipientName: string;
    city: string;
    province: string;
  };
}

export function orderShippedTemplate(p: OrderShippedPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Pesanan ${p.orderNumber} Sedang Dikirim 🚚`;

  const content = `
    <h1 style="margin:0 0 4px;font-size:22px;color:${COLORS.brand};">Pesananmu Sedang Dalam Perjalanan 🚚</h1>
    <p style="margin:0 0 24px;color:${COLORS.muted};">Nomor pesanan: <strong>${p.orderNumber}</strong></p>

    <p>Pesananmu sedang dikirim ke <strong>${p.address.recipientName}</strong> di ${p.address.city}, ${p.address.province}.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};border-radius:8px;padding:16px 20px;margin:16px 0;">
      <tr>
        <td style="font-size:14px;color:${COLORS.muted};">Kurir</td>
        <td style="font-size:14px;font-weight:600;color:${COLORS.text};text-align:right;">${p.courier.toUpperCase()}</td>
      </tr>
      ${p.trackingNumber ? `
      <tr>
        <td style="font-size:14px;color:${COLORS.muted};padding-top:8px;">No. Resi</td>
        <td style="font-size:16px;font-weight:700;color:${COLORS.brand};text-align:right;padding-top:8px;font-family:monospace;">${p.trackingNumber}</td>
      </tr>` : ""}
    </table>

    ${p.trackingNumber ? button("Lacak Paket", `http://localhost:3010/orders/${p.orderNumber}/track`) : ""}

    <p style="font-size:13px;color:${COLORS.muted};">
      Pastikan ada orang di rumah untuk menerima paket. Jika ada masalah, hubungi
      <a href="mailto:support@my-ecommerce.com" style="color:${COLORS.accent};">support@my-ecommerce.com</a>
    </p>
  `;

  const text = `Pesanan ${p.orderNumber} sedang dikirim via ${p.courier.toUpperCase()}${p.trackingNumber ? ` — Resi: ${p.trackingNumber}` : ""}.`;

  return { subject, html: baseLayout(subject, content), text };
}

// 4. Order cancelled ───────────────────────────────────────────────────────────

export interface OrderCancelledPayload {
  orderNumber: string;
  email: string;
  reason: string | null;
  grandTotal: number;
}

const CANCEL_REASON_LABELS: Record<string, string> = {
  payment_expired: "Batas waktu pembayaran habis",
  customer_request: "Permintaan pelanggan",
  out_of_stock: "Stok habis",
  fraud_detected: "Terdeteksi aktivitas mencurigakan",
  admin_action: "Dibatalkan oleh tim kami",
};

export function orderCancelledTemplate(p: OrderCancelledPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Pesanan ${p.orderNumber} Dibatalkan`;
  const reasonLabel = p.reason
    ? (CANCEL_REASON_LABELS[p.reason] ?? p.reason)
    : "Tidak disebutkan";

  const content = `
    <h1 style="margin:0 0 4px;font-size:22px;color:${COLORS.brand};">Pesanan Dibatalkan</h1>
    <p style="margin:0 0 24px;color:${COLORS.muted};">Nomor pesanan: <strong>${p.orderNumber}</strong></p>

    <p>Pesananmu senilai <strong>${formatIDR(p.grandTotal)}</strong> telah dibatalkan.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border:1px solid #fde8cc;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <tr>
        <td style="font-size:14px;color:${COLORS.muted};">Alasan pembatalan</td>
      </tr>
      <tr>
        <td style="font-size:14px;font-weight:600;color:${COLORS.text};padding-top:4px;">${reasonLabel}</td>
      </tr>
    </table>

    <p>Jika kamu melakukan pembayaran dan pesanan dibatalkan karena stok habis atau masalah teknis, dana akan dikembalikan dalam <strong>1–3 hari kerja</strong>.</p>

    ${button("Belanja Lagi", "http://localhost:3010/products")}

    <p style="font-size:13px;color:${COLORS.muted};">
      Ada pertanyaan? Hubungi kami di
      <a href="mailto:support@my-ecommerce.com" style="color:${COLORS.accent};">support@my-ecommerce.com</a>
    </p>
  `;

  const text = `Pesanan ${p.orderNumber} (${formatIDR(p.grandTotal)}) dibatalkan. Alasan: ${reasonLabel}.`;

  return { subject, html: baseLayout(subject, content), text };
}

// 5. Password reset ────────────────────────────────────────────────────────────

export interface PasswordResetPayload {
  email: string;
  resetToken: string;
  expiresAt: string;
}

export function passwordResetTemplate(p: PasswordResetPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Reset Password My Ecommerce";
  const resetUrl = `http://localhost:3010/auth/reset-password?token=${p.resetToken}`;

  const content = `
    <h1 style="margin:0 0 4px;font-size:22px;color:${COLORS.brand};">Reset Password 🔑</h1>
    <p style="margin:0 0 24px;color:${COLORS.muted};">Untuk akun: <strong>${p.email}</strong></p>

    <p>Kami menerima permintaan untuk mereset password akun kamu. Klik tombol di bawah untuk membuat password baru.</p>

    ${button("Reset Password", resetUrl)}

    <p style="font-size:13px;color:${COLORS.muted};">
      Link ini berlaku hingga <strong>${formatDate(p.expiresAt)}</strong> (30 menit).
      Jika kamu tidak meminta reset password, abaikan email ini — akun kamu aman.
    </p>

    ${divider()}

    <p style="font-size:12px;color:${COLORS.muted};">
      Jika tombol tidak berfungsi, salin dan tempel URL berikut di browser:<br/>
      <a href="${resetUrl}" style="color:${COLORS.accent};word-break:break-all;">${resetUrl}</a>
    </p>
  `;

  const text = `Reset password: ${resetUrl}\nLink berlaku hingga ${formatDate(p.expiresAt)}.\nAbaikan jika kamu tidak memintanya.`;

  return { subject, html: baseLayout(subject, content), text };
}

