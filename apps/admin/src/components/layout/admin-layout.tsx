// =============================================================================
// Admin layout — sidebar + header + content area
// =============================================================================

import React, { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

