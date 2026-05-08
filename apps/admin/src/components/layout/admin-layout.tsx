// =============================================================================
// Admin layout — sidebar + header + content area
// =============================================================================

import type { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface AdminLayoutProps {
  children: ReactNode;
  subtitle?: string;
  title: string;
}

export function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header subtitle={subtitle} title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
