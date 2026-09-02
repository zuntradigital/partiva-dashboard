"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { Sidebar, SidebarContent } from "./Sidebar";
import { Navbar } from "./Navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {/* Always mounted (not conditionally rendered) so the panel can
          transition out, not just in -- closing it by unmounting would only
          animate the open direction. Slides in from the reading-start edge
          the panel itself sits at (`start-0`, i.e. the right in RTL), which
          a physical -translate-x/translate-x pair can't express on its own,
          so the closed-state direction is picked from the current language
          instead of relying on an rtl: transform variant. */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ease-out ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute inset-y-0 start-0 w-72 border-e border-border bg-surface shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : lang === "ar" ? "translate-x-full" : "-translate-x-full"
          }`}
        >
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

      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
