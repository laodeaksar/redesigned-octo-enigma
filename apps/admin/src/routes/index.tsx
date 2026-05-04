import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad() {
    if (isAuthenticated()) {
      throw redirect({ to: "/_admin/dashboard" });
    }
    throw redirect({ to: "/_auth/login" });
  },
});

