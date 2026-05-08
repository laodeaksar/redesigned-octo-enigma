// =============================================================================
// Login page
// =============================================================================

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth.store";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@my-ecommerce.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      await navigate({ to: "/_admin/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="font-semibold text-foreground text-lg">Masuk</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Gunakan akun admin untuk melanjutkan
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        {/* Email */}
        <div>
          <label
            className="mb-1.5 block font-medium text-foreground text-sm"
            htmlFor="email"
          >
            Email
          </label>
          <input
            autoComplete="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@my-ecommerce.com"
            required
            type="email"
            value={email}
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="mb-1.5 block font-medium text-foreground text-sm"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              autoComplete="current-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              type="button"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5",
            "font-semibold text-primary-foreground text-sm transition-opacity",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          )}
          disabled={isLoading}
          type="submit"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Masuk…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
