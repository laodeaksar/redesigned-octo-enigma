import { useEffect } from "react";
import { toast, Toaster } from "sonner";

// Expose a tiny global so vanilla Astro inline scripts can fire toasts
// without needing React context. Falls back gracefully if not yet mounted.
declare global {
  interface Window {
    __notify?: {
      error: (message: string, description?: string) => void;
      info: (message: string, description?: string) => void;
      success: (message: string, description?: string) => void;
    };
  }
}

export function ToastProvider() {
  useEffect(() => {
    window.__notify = {
      error: (message, description) =>
        toast.error(message, { description }),
      info: (message, description) =>
        toast.info(message, { description }),
      success: (message, description) =>
        toast.success(message, { description }),
    };
    return () => {
      delete window.__notify;
    };
  }, []);

  return (
    <Toaster
      closeButton
      duration={4000}
      position="bottom-right"
      richColors
    />
  );
}
