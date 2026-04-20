import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
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
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  if (sec < 3600) return `${Math.floor(sec / 60)} menit lalu`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} jam lalu`;
  return `${Math.floor(sec / 86400)} hari lalu`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment:    "Menunggu Pembayaran",
  processing:         "Diproses",
  shipped:            "Dikirim",
  delivered:          "Terkirim",
  completed:          "Selesai",
  cancelled:          "Dibatalkan",
  refund_requested:   "Minta Refund",
  refunded:           "Direfund",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending_payment:  "bg-yellow-100 text-yellow-800",
  processing:       "bg-blue-100 text-blue-800",
  shipped:          "bg-indigo-100 text-indigo-800",
  delivered:        "bg-teal-100 text-teal-800",
  completed:        "bg-green-100 text-green-800",
  cancelled:        "bg-red-100 text-red-800",
  refund_requested: "bg-orange-100 text-orange-800",
  refunded:         "bg-gray-100 text-gray-600",
};

