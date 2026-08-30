"use client";

import { Card, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { timeAgo } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

export function RecentPricingChanges({ items }: { items: AuditLogEntry[] }) {
  const { lang, t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("widgets.recentPricingTitle")}</CardTitle>
      </CardHeader>
      <div className="p-5 pt-3">
        {items.length === 0 ? (
          <EmptyState icon="pricing" title={t("widgets.noRecentPricing")} description={t("widgets.noRecentPricingDesc")} />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-border-soft bg-background-soft p-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                  <Icon name="pricing" className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.resourceLabel}</p>
                  {item.previousValue && item.newValue && (
                    <p className="mt-0.5 text-xs text-muted">
                      <span className="text-danger line-through">{item.previousValue}</span>
                      <span className="mx-1">←</span>
                      <span className="text-success">{item.newValue}</span>
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-soft">
                    {item.actor.name} · {timeAgo(item.timestamp, lang)}
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
