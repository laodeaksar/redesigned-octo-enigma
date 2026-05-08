// =============================================================================
// Header — top bar with page title + breadcrumbs
// =============================================================================

import { Bell, Search } from "lucide-react";
import { useAuth } from "@/stores/auth.store";

interface HeaderProps {
  subtitle?: string;
  title: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-border border-b bg-background px-6">
      {/* Title */}
      <div>
        <h1 className="font-semibold text-foreground text-lg leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-muted-foreground text-sm">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-56 rounded-md border border-input bg-transparent pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Cari..."
            type="search"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
          {user?.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
