"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";

export function ContentHealth({ missingTranslation, missingSeo }: { missingTranslation: number; missingSeo: number }) {
  const { t } = useLanguage();
  const rows = [
    { label: t("widgets.missingTranslation"), value: missingTranslation, href: "/blog", icon: "globe" as const },
    { label: t("widgets.missingSeo"), value: missingSeo, href: "/blog", icon: "search" as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("widgets.contentHealthTitle")}</CardTitle>
      </CardHeader>
      <ul className="divide-y divide-border-soft p-5 pt-3">
        {rows.map((row) => (
          <li key={row.label}>
            <Link href={row.href} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-muted">
                <Icon name={row.icon} className="h-4 w-4" />
              </div>
              <span className="flex-1 text-sm text-foreground">{row.label}</span>
              <span className={row.value > 0 ? "text-sm font-bold text-warning" : "text-sm font-bold text-success"}>{row.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
