import type { Action, AuditLogEntry, Resource } from "@/types";
import type { BackendArticle, BackendPage } from "@/lib/api";
import { auditActionLabel } from "@/lib/status";
import type { Lang } from "@/lib/i18n";

export interface ContentCounts {
  /** Total language editions with any content started -- an article with
   * both an Arabic and an English draft counts twice, one with only Arabic
   * counts once. Matches the "9 Arabic + 9 English = 18" reading of "how
   * many articles do I have", not the row count in the articles table. */
  articlesTotal: number;
  articlesAr: number;
  articlesEn: number;
  pagesTotal: number;
  pagesHidden: number;
}

export function getContentCounts(articles: BackendArticle[], pages: BackendPage[]): ContentCounts {
  // "سواء مكتملة أو لأ" -- complete or not still counts, so only
  // "not_started" (no content ever entered for that language) is excluded.
  // Previously required status === "published" && translationStatus ===
  // "complete", which read as 0 whenever nothing was both published and
  // fully translated even with plenty of draft/in-progress articles sitting
  // in the list right below it.
  const articlesAr = articles.filter((a) => a.translationStatus.ar !== "not_started").length;
  const articlesEn = articles.filter((a) => a.translationStatus.en !== "not_started").length;
  return {
    articlesTotal: articlesAr + articlesEn,
    articlesAr,
    articlesEn,
    pagesTotal: pages.length,
    pagesHidden: pages.filter((p) => !p.visible).length,
  };
}

type Can = (resource: Resource, action: Action) => boolean;

export function getPendingReviews(articles: BackendArticle[], can: Can) {
  if (!can("articles", "approve")) return [];
  return articles
    .filter((a) => a.status === "review")
    .map((a) => ({
      id: String(a.id),
      label: a.translations.ar?.title ?? a.translations.en?.title ?? String(a.id),
      type: "article" as const,
      updatedAt: a.updatedAt,
    }));
}

export function getContentHealthFlags(articles: BackendArticle[]) {
  const missingTranslation = articles.filter((a) => a.translationStatus.ar !== "complete" || a.translationStatus.en !== "complete").length;
  const missingSeo = articles.filter((a) => !a.translations.ar?.seo?.title || !a.translations.en?.seo?.title).length;
  return { missingTranslation, missingSeo };
}

// Audit log entries are already sorted newest-first by the caller (mirrors
// the real Audit Log page's own fetch). `resourceType` -> permission mapping
// covers every resource the audit log can currently record.
const RESOURCE_ACCESS: Record<string, Resource> = {
  pages: "pages",
  articles: "articles",
  pricing: "pricing",
  testimonials: "testimonials",
  faq: "faq",
  media: "media",
  contact: "contact_info",
};

export function getRecentEdits(entries: AuditLogEntry[], can: Can, lang: Lang = "ar", limit = 10) {
  return entries
    .filter((e) => can(RESOURCE_ACCESS[e.resourceType] ?? "pages", "view"))
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      resourceLabel: e.resourceLabel,
      actor: e.actor,
      timestamp: e.timestamp,
      summary: auditActionLabel(e.action, lang),
    }));
}

export function getRecentPublishingActivity(entries: AuditLogEntry[], can: Can, limit = 10) {
  return entries
    .filter((e) => e.action === "publish" || e.action === "unpublish")
    .filter((e) => can(RESOURCE_ACCESS[e.resourceType] ?? "pages", "view"))
    .slice(0, limit);
}

export function getRecentPricingChanges(entries: AuditLogEntry[], can: Can, limit = 5) {
  if (!can("pricing", "view")) return [];
  return entries.filter((e) => e.resourceType === "pricing").slice(0, limit);
}
