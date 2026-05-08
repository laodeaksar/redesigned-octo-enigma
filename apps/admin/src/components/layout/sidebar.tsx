// =============================================================================
// Sidebar — main admin navigation
// =============================================================================

import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/stores/auth.store";

interface NavItem {
  badge?: number;
  href: string;
  icon: React.ElementType;
  label: string;
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
    <aside className="flex h-screen w-64 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-sidebar-border border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShoppingCart className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">My Ecommerce</p>
          <p className="text-muted-foreground text-xs">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Menu
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink item={item} key={item.href} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-sidebar-border border-t p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{user?.name}</p>
            <p className="truncate text-muted-foreground text-xs">
              {user?.role}
            </p>
          </div>
        </div>
        <button
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-sidebar-accent hover:text-foreground"
          onClick={() => void logout()}
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
      activeProps={{
        className: "bg-sidebar-accent text-foreground font-medium",
      }}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
      to={item.href}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 font-medium text-primary-foreground text-xs">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
