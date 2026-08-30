"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";

const TYPE_HREF: Record<string, string> = { article: "/blog", faq: "/faq", testimonial: "/testimonials" };
const TYPE_LABEL_KEY: Record<string, string> = { article: "widgets.typeArticle", faq: "widgets.typeFaq", testimonial: "widgets.typeTestimonial" };

export function PendingReviews({ items }: { items: Array<{ id: string; label: string; type: string; updatedAt: string }> }) {
  const { t } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("widgets.pendingReviewsTitle")}</CardTitle>
        <Badge variant="warning">{items.length}</Badge>
      </CardHeader>
      <div className="p-5 pt-3">
        {items.length === 0 ? (
          <EmptyState icon="check" title={t("widgets.noPendingReviews")} />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={TYPE_HREF[item.type] ?? "/"}
                  className="flex items-center gap-3 rounded-xl border border-border-soft bg-background-soft px-3.5 py-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <Icon name="clock" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-soft">{t(TYPE_LABEL_KEY[item.type] ?? "widgets.typeArticle")}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
