// =============================================================================
// Utility helpers
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Class name helper ─────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency ──────────────────────────────────────────────────────────────────

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "baru saja";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} hari lalu`;
  return formatDate(date);
}

// ── String ────────────────────────────────────────────────────────────────────

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ── Order status labels ───────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Terkirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refund_requested: "Minta Refund",
  refunded: "Direfund",
};

export const ORDER_STATUS_COLORS: Record<
  string,
  "default" | "warning" | "info" | "success" | "destructive" | "secondary"
> = {
  pending_payment: "warning",
  processing: "info",
  shipped: "info",
  delivered: "success",
  completed: "success",
  cancelled: "destructive",
  refund_requested: "warning",
  refunded: "secondary",
};

