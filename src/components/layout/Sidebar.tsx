"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { NAV_ITEMS, NAV_ITEMS_SECONDARY, type NavItem } from "./nav-items";

// The Sidebar logo is the same physical asset the Website serves from its
// own public/images -- referenced by URL instead of copied in, so there is
// only ever one logo file.
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3002";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, lang, onNavigate }: { item: NavItem; active: boolean; lang: "ar" | "en"; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        active ? "bg-gradient-brand text-white shadow-glow" : "text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <Icon
        name={item.icon}
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
          active ? "text-white" : "text-muted-soft group-hover:text-foreground",
        )}
      />
      <span className="truncate">{lang === "ar" ? item.label : item.labelEn}</span>
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const { lang, t } = useLanguage();

  const visiblePrimary = NAV_ITEMS.filter((item) => !item.resource || can(item.resource, "view"));
  const visibleSecondary = NAV_ITEMS_SECONDARY.filter((item) => !item.resource || can(item.resource, "view"));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Link href="/">
          <img src={`${WEBSITE_URL}/images/logo.png`} alt="Partiva" className="h-14 w-auto max-w-full object-contain" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {visiblePrimary.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} lang={lang} onNavigate={onNavigate} />
        ))}

        {visibleSecondary.length > 0 && (
          <>
            <div className="my-3 border-t border-border-soft" />
            {visibleSecondary.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} lang={lang} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      <div className="m-3 rounded-2xl border border-border bg-gradient-to-br from-surface-hover to-surface p-4">
        <p className="text-xs font-semibold text-foreground">{t("sidebar.helpTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{t("sidebar.helpBody")}</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-border bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}
