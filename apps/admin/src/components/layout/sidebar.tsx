// =============================================================================
// Sidebar — main admin navigation
// =============================================================================

import type React from "react";
import { useAuth } from "@/stores/auth.store";
import { Link } from "@tanstack/react-router";
import {
  BarChart2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Tag,
  Users,
  Webhook,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  badge?: number;
  href: string;
  icon: React.ElementType;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  href: "/_admin/dashboard",  icon: LayoutDashboard },
  { label: "Analitik",   href: "/_admin/analytics",  icon: BarChart2        },
  { label: "Produk",     href: "/_admin/products/",  icon: Package          },
  { label: "Pesanan",    href: "/_admin/orders/",    icon: ShoppingCart     },
  { label: "Pengguna",   href: "/_admin/users/",     icon: Users            },
  { label: "Voucher",    href: "/_admin/vouchers/",  icon: Tag              },
  { label: "Pembayaran", href: "/_admin/payments/",        icon: CreditCard },
  { label: "Webhook",    href: "/_admin/webhook-events/",  icon: Webhook    },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground flex h-screen w-64 flex-col border-r">
      {/* Brand */}
      <div className="border-sidebar-border flex h-16 items-center gap-3 border-b px-6">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
          <ShoppingCart className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">My Ecommerce</p>
          <p className="text-muted-foreground text-xs">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="text-muted-foreground mb-2 px-3 text-xs font-medium uppercase tracking-wider">
          Menu
        </p>
        {NAV_ITEMS.map(item => (
          <NavLink item={item} key={item.href} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-sidebar-border border-t p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {user?.role}
            </p>
          </div>
        </div>
        <button
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
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
        <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-medium">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
