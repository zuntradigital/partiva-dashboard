"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { roleLabel } from "@/lib/rbac";
import { fetchNotifications, markNotificationsRead, type BackendNotification } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_ITEMS_SECONDARY, type NavItem } from "./nav-items";

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

// Searches the same nav destinations the Sidebar links to (bilingual label +
// href match), filtered by the same `can(resource, "view")` gate the Sidebar
// already uses -- no new data source, no results the user couldn't already
// reach from the menu.
function GlobalSearch() {
  const { can } = useSession();
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useClickOutside(() => setFocused(false));

  const items = useMemo(
    () => [...NAV_ITEMS, ...NAV_ITEMS_SECONDARY].filter((item) => !item.resource || can(item.resource, "view")),
    [can],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const qLower = q.toLowerCase();
    return items.filter(
      (item) => item.label.includes(q) || item.labelEn.toLowerCase().includes(qLower) || item.href.toLowerCase().includes(qLower),
    );
  }, [items, query]);

  function go(item: NavItem) {
    router.push(item.href);
    setQuery("");
    setFocused(false);
  }

  return (
    <div className="relative max-w-sm flex-1" ref={ref}>
      <SearchInput
        placeholder={t("nav.quickSearch")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0]);
          if (e.key === "Escape") setFocused(false);
        }}
      />
      {focused && query.trim() !== "" && (
        <div className="animate-fade-in absolute start-0 top-full z-40 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface-soft shadow-2xl">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-soft">{t("common.noResults")}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <button
                  key={item.href}
                  onClick={() => go(item)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm text-foreground transition-colors hover:bg-surface-hover"
                >
                  <Icon name={item.icon} className="h-4 w-4 shrink-0 text-muted-soft" />
                  <span className="truncate">{lang === "ar" ? item.label : item.labelEn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      aria-label={isLight ? t("nav.toDarkMode") : t("nav.toLightMode")}
      title={isLight ? t("nav.darkMode") : t("nav.lightMode")}
    >
      <Icon name={isLight ? "moon" : "sun"} className="h-[18px] w-[18px]" />
    </button>
  );
}

// Mirrors the Website's own AR/EN pill switch (a small text toggle, not an
// icon) -- same interaction pattern users already know from the public site.
export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="flex h-10 min-w-10 items-center justify-center rounded-xl px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {lang === "ar" ? "EN" : "AR"}
    </button>
  );
}

function NotificationsMenu() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BackendNotification[]>([]);
  const ref = useClickOutside(() => setOpen(false));
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    void fetchNotifications().then(setItems).catch(() => {});
  }, []);

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next && unread > 0) {
        setItems((list) => list.map((n) => ({ ...n, read: true })));
        void markNotificationsRead().catch(() => {});
      }
      return next;
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label={t("nav.notifications")}
      >
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute end-2 top-2 flex h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
        )}
      </button>
      {open && (
        <div className="animate-fade-in absolute end-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface-soft shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{t("nav.notifications")}</p>
            <Badge variant="brand">{unread} {t("nav.newBadge")}</Badge>
          </div>
          <div className="max-h-96 divide-y divide-border-soft overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-xs text-muted-soft">{t("nav.noNotifications")}</p>}
            {items.map((n) => (
              <div key={n.id} className={cn("flex gap-3 px-4 py-3", !n.read && "bg-surface-hover/40")}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                  <Icon name={n.icon as IconName} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.titleAr}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.detailAr}</p>
                  <p className="mt-1 text-[11px] text-muted-soft">{timeAgo(n.timestamp, lang)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useSession();
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  if (!user) return null;

  const roleBadge = user.roles[0] ? roleLabel(user.roles[0], lang) : t("nav.noRole");

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-surface-hover">
        <Avatar name={user.name} initials={user.avatarInitials} />
        <div className="hidden text-start sm:block">
          <p className="text-sm font-medium leading-tight text-foreground">{user.name}</p>
          <Badge variant="brand" className="mt-1">
            {roleBadge}
          </Badge>
        </div>
        <Icon name="chevron-down" className="hidden h-3.5 w-3.5 text-muted sm:block" />
      </button>
      {open && (
        <div className="animate-fade-in absolute end-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-soft py-1 shadow-2xl">
          <div className="border-b border-border-soft px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-soft">{user.email}</p>
            <Badge variant="brand" className="mt-1.5">
              {roleBadge}
            </Badge>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              logout();
              router.push("/login");
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm text-danger transition-colors hover:bg-danger/10"
          >
            <Icon name="logout" className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3.5 backdrop-blur sm:px-6">
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-hover lg:hidden"
        aria-label={t("nav.menu")}
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      <GlobalSearch />

      <div className="ms-auto flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <NotificationsMenu />
        <div className="ms-1 border-s border-border-soft ps-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
