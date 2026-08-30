"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { Sidebar, SidebarContent } from "./Sidebar";
import { Navbar } from "./Navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 border-e border-border bg-surface shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute end-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover"
              aria-label={t("common.closeMenu")}
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
