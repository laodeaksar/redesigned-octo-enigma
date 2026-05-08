import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { isAuthenticated } from "@/lib/auth";

export const Route = createFileRoute("/_auth")({
  beforeLoad() {
    if (isAuthenticated()) {
      throw redirect({ to: "/_admin/dashboard" });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
            <span className="text-primary-foreground text-xl">🛒</span>
          </div>
          <h1 className="text-foreground text-xl font-bold">My Ecommerce</h1>
          <p className="text-muted-foreground mt-1 text-sm">Admin Panel</p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
