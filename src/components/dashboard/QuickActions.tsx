"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import type { Action, Resource } from "@/types";

interface QuickAction {
  labelKey: string;
  href: string;
  icon: IconName;
  resource: Resource;
  action: Action;
}

const ACTIONS: QuickAction[] = [
  { labelKey: "widgets.newArticle", href: "/blog/new", icon: "plus", resource: "articles", action: "create" },
  { labelKey: "widgets.editPage", href: "/pages", icon: "pages", resource: "pages", action: "edit" },
  { labelKey: "widgets.editPricing", href: "/pricing", icon: "pricing", resource: "pricing", action: "edit" },
  { labelKey: "widgets.uploadMedia", href: "/media", icon: "upload", resource: "media", action: "create" },
];

export function QuickActions() {
  const { can } = useSession();
  const { t } = useLanguage();
  const visible = ACTIONS.filter((a) => can(a.resource, a.action));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("widgets.quickActionsTitle")}</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-3 p-5">
        {visible.length === 0 && <p className="col-span-2 text-xs text-muted">{t("widgets.noQuickActions")}</p>}
        {visible.map((action) => (
          <Link
            key={action.labelKey}
            href={action.href}
            className="flex flex-col items-start gap-3 rounded-xl border border-border-soft bg-background-soft p-4 transition-colors hover:border-primary/50 hover:bg-surface-hover"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-white">
              <Icon name={action.icon} className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">{t(action.labelKey)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
