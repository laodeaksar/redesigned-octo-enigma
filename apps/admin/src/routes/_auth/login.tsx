// =============================================================================
// Login page
// =============================================================================

import { useState } from "react";
import type React from "react";
import { useAuth } from "@/stores/auth.store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

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
    <div className="border-border bg-card rounded-xl border p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-foreground text-lg font-semibold">Masuk</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Gunakan akun admin untuk melanjutkan
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={e => void handleSubmit(e)}>
        {/* Email */}
        <div>
          <label
            className="text-foreground mb-1.5 block text-sm font-medium"
            htmlFor="email"
          >
            Email
          </label>
          <input
            autoComplete="email"
            className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            id="email"
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@my-ecommerce.com"
            required
            type="email"
            value={email}
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="text-foreground mb-1.5 block text-sm font-medium"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              autoComplete="current-password"
              className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
              id="password"
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setShowPassword(v => !v)}
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
            "bg-primary flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5",
            "text-primary-foreground text-sm font-semibold transition-opacity",
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
