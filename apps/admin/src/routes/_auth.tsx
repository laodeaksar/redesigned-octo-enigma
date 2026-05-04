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
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl text-primary-foreground">🛒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">My Ecommerce</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin Panel</p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}

