import { toast } from "sonner";

export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  error: (message: string, description?: string) =>
    toast.error(message, { description }),

  info: (message: string, description?: string) =>
    toast.info(message, { description }),

  loading: (message: string) => toast.loading(message),

  promise: toast.promise,

  dismiss: (id?: string | number) => toast.dismiss(id),
};
