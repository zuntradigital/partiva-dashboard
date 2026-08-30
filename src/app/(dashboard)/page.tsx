"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardSkeleton, Skeleton, Donut, EmptyState, PageHeader } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PendingReviews } from "@/components/dashboard/PendingReviews";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RecentPricingChanges } from "@/components/dashboard/RecentPricingChanges";
import { ContentHealth } from "@/components/dashboard/ContentHealth";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import {
  getContentCounts,
  getContentHealthFlags,
  getPendingReviews,
  getRecentPublishingActivity,
  getRecentPricingChanges,
  getRecentEdits,
} from "@/lib/dashboard";
import { fetchArticles, fetchPages, fetchAuditLog, type BackendArticle, type BackendPage } from "@/lib/api";
import { statusLabel } from "@/lib/status";
import { roleLabel } from "@/lib/rbac";
import type { AuditLogEntry, ContentStatus } from "@/types";

const STATUS_DONUT_COLORS: Record<ContentStatus, string> = {
  published: "#22c55e",
  draft: "#5f6883",
  review: "#f59e0b",
  approved: "#22d3ee",
  scheduled: "#8b5cf6",
  unpublished: "#ef4444",
  archived: "#232a45",
};

export default function DashboardPage() {
  const { user, can } = useSession();
  const { lang, t } = useLanguage();
  const [articles, setArticles] = useState<BackendArticle[] | null>(null);
  const [pages, setPages] = useState<BackendPage[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Two independent fetches so each half of the page can show its own
  // loading state instead of the whole page waiting on the slower one.
  useEffect(() => {
    Promise.all([fetchArticles(), fetchPages()])
      .then(([a, p]) => {
        setArticles(a);
        setPages(p);
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    fetchAuditLog()
      .then((log) => setAuditLog([...(log as unknown as AuditLogEntry[])].sort((x, y) => +new Date(y.timestamp) - +new Date(x.timestamp))))
      .catch(() => setLoadError(true));
  }, []);

  if (!user) return null;

  const header = (
    <PageHeader
      title={t("home.greeting", { name: user.name })}
      description={t("home.description", { role: user.roles[0] ? roleLabel(user.roles[0], lang) : t("nav.noRole") })}
    />
  );

  if (loadError) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState icon="alert" title={t("home.loadErrorTitle")} description={t("home.loadErrorDesc")} />
      </div>
    );
  }

  // Content (articles/pages) and the audit log load independently -- each
  // half of the page shows its own skeleton instead of the whole page
  // waiting on whichever fetch is slower.
  const contentReady = articles !== null && pages !== null;
  const auditReady = auditLog !== null;

  const counts = contentReady ? getContentCounts(articles, pages) : null;
  const health = contentReady ? getContentHealthFlags(articles) : null;
  const pendingReviews = contentReady ? getPendingReviews(articles, can) : null;
  const recentActivity = auditReady ? getRecentPublishingActivity(auditLog, can) : null;
  const recentEdited = auditReady ? getRecentEdits(auditLog, can, lang) : null;
  const recentPricing = auditReady ? getRecentPricingChanges(auditLog, can) : null;

  const articleStatusSegments = contentReady
    ? (Object.entries(
        articles.reduce<Partial<Record<ContentStatus, number>>>((acc, a) => {
          acc[a.status] = (acc[a.status] ?? 0) + 1;
          return acc;
        }, {}),
      ) as [ContentStatus, number][])
        .filter(([, value]) => value > 0)
        .map(([status, value]) => ({ label: statusLabel(status, lang), value, color: STATUS_DONUT_COLORS[status] }))
    : [];

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!contentReady || !counts || !pendingReviews || !health ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon="blog"
              label={t("home.statArticles")}
              value={counts.articlesTotal}
              sublabel={t("home.statArticlesSub", { ar: counts.articlesPublishedAr, en: counts.articlesPublishedEn })}
              accent="linear-gradient(135deg,#4f6df5,#8b5cf6)"
            />
            <StatCard
              icon="pages"
              label={t("home.statPages")}
              value={counts.pagesTotal}
              sublabel={t("home.statPagesSub", { count: counts.pagesHidden })}
              accent="linear-gradient(135deg,#22d3ee,#4f6df5)"
            />
            <StatCard
              icon="clock"
              label={t("home.statPending")}
              value={pendingReviews.length}
              sublabel={t("home.statPendingSub")}
              accent="linear-gradient(135deg,#f59e0b,#f43f5e)"
            />
            <StatCard
              icon="alert"
              label={t("home.statHealth")}
              value={health.missingTranslation + health.missingSeo}
              sublabel={t("home.statHealthSub")}
              accent="linear-gradient(135deg,#8b5cf6,#22d3ee)"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("home.articleStatusTitle")}</CardTitle>
            </CardHeader>
            <div className="p-5 pt-3">
              {!contentReady ? (
                <Skeleton className="h-48 w-full" />
              ) : articleStatusSegments.length === 0 ? (
                <EmptyState icon="blog" title={t("home.noArticlesYet")} />
              ) : (
                <Donut segments={articleStatusSegments} />
              )}
            </div>
          </Card>
          {!auditReady || !recentEdited ? <CardListSkeleton title={t("widgets.recentActivityTitle")} /> : <RecentActivity items={recentEdited} />}
        </div>

        <div className="space-y-6">
          <QuickActions />
          {!contentReady || !pendingReviews ? (
            <CardListSkeleton title={t("widgets.pendingReviewsTitle")} />
          ) : (
            <PendingReviews items={pendingReviews} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {!auditReady || !recentPricing ? (
          <CardListSkeleton title={t("widgets.recentPricingTitle")} />
        ) : (
          <RecentPricingChanges items={recentPricing} />
        )}
        {!contentReady || !health ? (
          <CardListSkeleton title={t("widgets.contentHealthTitle")} />
        ) : (
          <ContentHealth missingTranslation={health.missingTranslation} missingSeo={health.missingSeo} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t("home.recentPublishTitle")}</CardTitle>
          </CardHeader>
          <div className="space-y-3 p-5 pt-3">
            {!auditReady || !recentActivity ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
            ) : recentActivity.length === 0 ? (
              <p className="text-xs text-muted">{t("home.noRecentPublish")}</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{entry.resourceLabel}</span>
                    <span className="text-muted-soft">{entry.actor.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Loading placeholder for a Card widget that's just a titled list (Recent
// Activity, Pending Reviews, Recent Pricing Changes) -- same Card/title
// chrome as the loaded state, shimmer rows instead of content.
function CardListSkeleton({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="space-y-3 p-5 pt-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </Card>
  );
}
