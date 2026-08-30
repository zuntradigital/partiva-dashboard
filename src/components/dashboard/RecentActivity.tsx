"use client";

import { Card, CardHeader, CardTitle, Avatar, EmptyState } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import { timeAgo } from "@/lib/utils";
import type { ContentVersion } from "@/types";

export function RecentActivity({ items }: { items: ContentVersion[] }) {
  const { lang, t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("widgets.recentActivityTitle")}</CardTitle>
      </CardHeader>
      <div className="p-5 pt-3">
        {items.length === 0 ? (
          <EmptyState icon="history" title={t("widgets.noRecentActivity")} />
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <Avatar name={item.actor.name} initials={item.actor.name.slice(0, 2)} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.actor.name}</span> — {item.summary}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-soft">
                    {item.resourceLabel} · {timeAgo(item.timestamp, lang)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
