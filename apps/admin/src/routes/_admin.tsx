import React from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/_admin")({
  beforeLoad() {
    if (!isAuthenticated()) {
      throw redirect({ to: "/_auth/login" });
    }
  },
  component: AdminLayoutWrapper,
});

function AdminLayoutWrapper() {
  return <Outlet />;
}

