// =============================================================================
// Sidebar — main admin navigation
// =============================================================================

import React from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth.store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/_admin/dashboard", icon: LayoutDashboard },
  { label: "Produk", href: "/_admin/products/", icon: Package },
  { label: "Pesanan", href: "/_admin/orders/", icon: ShoppingCart },
  { label: "Pengguna", href: "/_admin/users/", icon: Users },
  { label: "Voucher", href: "/_admin/vouchers/", icon: Tag },
  { label: "Pembayaran", href: "/_admin/payments/", icon: CreditCard },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShoppingCart className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">My Ecommerce</p>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
      activeProps={{
        className: "bg-sidebar-accent text-foreground font-medium",
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

