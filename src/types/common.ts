export type Locale = "ar" | "en";

export type LocalizedText = Record<Locale, string>;

/** Unified publishing state per SRS Section 12 (Draft → Review → Approved → Scheduled → Published → Archived),
 * plus "unpublished" for the Page-specific unpublish action (WEB-ADM-FR-013). */
export type ContentStatus =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "unpublished"
  | "archived";

export type TranslationStatus = "not_started" | "in_progress" | "complete";

export interface ActorRef {
  id: string;
  name: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: "index, follow" | "noindex";
  robotsLocked: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImageId?: string;
}

export interface ContentVersion {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceLabel: string;
  locale?: Locale;
  actor: ActorRef;
  timestamp: string;
  summary: string;
}
