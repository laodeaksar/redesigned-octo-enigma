import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      closeButton
      duration={4000}
      position="bottom-right"
      richColors
    />
  );
}
