import type { ActorRef, ContentStatus, Locale, LocalizedText, SeoMetadata, TranslationStatus } from "./common";

/** The Marketing Website's fixed 13-page inventory (PAGE-HOME … PAGE-404), per
 * [Marketing Website SRS: Section 6]. This Admin Dashboard edits content within
 * this fixed set only — it cannot create pages beyond it (WEB-ADM-DEC-001). */
export type PageSlug =
  | "home"
  | "about"
  | "features"
  | "how-it-works"
  | "pricing"
  | "faq"
  | "contact"
  | "register"
  | "login"
  | "privacy-policy"
  | "terms-conditions"
  | "cookie-policy"
  | "404";

export interface PageSection {
  id: string;
  type: string;
  nameAr: string;
  nameEn: string;
  content: Record<Locale, { heading?: string; body: string }>;
  lastEditedAt: string;
  lastEditedBy: ActorRef;
}

export interface Page {
  id: string;
  slug: PageSlug;
  titleAr: string;
  titleEn: string;
  status: ContentStatus;
  isLegal: boolean;
  lastEditedAt: string;
  lastEditedBy: ActorRef;
  hasUnpublishedChanges: boolean;
  sections: PageSection[];
  seo: Record<Locale, SeoMetadata>;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  archived: boolean;
  articleCount: number;
}

export interface Tag {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  archived: boolean;
  articleCount: number;
}

export interface ArticleTranslation {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
}

export interface Article {
  id: string;
  status: ContentStatus;
  translations: Record<Locale, ArticleTranslation | null>;
  translationStatus: Record<Locale, TranslationStatus>;
  authorName: string;
  categoryId: string;
  tagIds: string[];
  featuredImageId?: string;
  publishDate: string | null;
  updatedDate: string;
  scheduledFor?: string | null;
  rejectionComment?: string | null;
  seo: Record<Locale, SeoMetadata>;
  readingTimeMinutes?: number;
}

export type PricingPlanKey = "basic" | "professional" | "enterprise";

export interface PricingLimit {
  labelAr: string;
  labelEn: string;
  type: "numeric" | "qualitative";
  value: string;
}

export interface PricingPlan {
  id: string;
  planKey: PricingPlanKey;
  nameAr: string;
  nameEn: string;
  price: number;
  currency: "SAR";
  billingPeriod: "monthly";
  featuresAr: string[];
  featuresEn: string[];
  limits: PricingLimit[];
  ctaLabelAr: string;
  ctaLabelEn: string;
  ctaTarget: "register" | "contact";
  displayOrder: number;
  active: boolean;
  featured: boolean;
  status: ContentStatus;
  lastChangedAt: string;
  lastChangedBy: ActorRef;
  hasPendingPreview: boolean;
}

export interface FaqItem {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  categoryId?: string;
  order: number;
  active: boolean;
  status: ContentStatus;
}

export interface Testimonial {
  id: string;
  name: string;
  company: string;
  role: string;
  text: LocalizedText;
  imageId?: string;
  verified: boolean;
  enteredBy: ActorRef;
  verifiedBy?: ActorRef;
  active: boolean;
  order: number;
  status: ContentStatus;
}

export interface MediaUsageRef {
  type: "page" | "article" | "testimonial" | "global";
  id: string;
  /** The real media_usage row id -- needed to target this specific usage for
   * removal/reassignment. Undefined for non-page usage kinds that don't come
   * from media_usage (mock-data-era article/testimonial refs). */
  usageId?: number;
  label: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeKB: number;
  width: number;
  height: number;
  altText: LocalizedText;
  uploaderName: string;
  uploadedAt: string;
  usedIn: MediaUsageRef[];
  accentColor: string;
}

export interface NavigationItem {
  id: string;
  label: LocalizedText;
  targetSlug: PageSlug | null;
  externalUrl: string | null;
  order: number;
  visible: boolean;
  locked: boolean;
}

export type FooterColumn = "product" | "company" | "legal" | "account";

export interface FooterItem {
  id: string;
  column: FooterColumn;
  label: LocalizedText;
  targetSlug: PageSlug | null;
  externalUrl: string | null;
  order: number;
  locked: boolean;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: LocalizedText;
  social: SocialLink[];
  updatedAt: string;
  updatedBy: ActorRef;
}
