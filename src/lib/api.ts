import { getToken, clearStoredSession } from "./auth-storage";
import type { Action, Resource } from "@/types";

// Set right before clearing the session on a 401, and read once by the
// Login page after AuthGate's redirect lands, so the user sees *why* they
// were sent back to Login instead of it looking like a silent failure.
export const SESSION_EXPIRED_FLAG = "partiva_session_expired";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

// apiFetch sits below the component tree and can't call useLanguage(), so it
// reads the <html lang> attribute directly -- already kept in sync with the
// user's language choice by the anti-FOUC script and LanguageProvider.
function currentLang(): "ar" | "en" {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar";
}

export class ApiError extends Error {
  status: number;
  errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}
interface ApiFailure {
  success: false;
  error_code: string;
  message: string;
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      currentLang() === "ar" ? "تعذّر الاتصال بالخادم — تأكد من تشغيل الـ backend" : "Couldn't reach the server — make sure the backend is running",
    );
  }

  const json = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !json || json.success === false) {
    const message = json && "message" in json ? json.message : currentLang() === "ar" ? "حدث خطأ غير متوقع" : "An unexpected error occurred";
    const errorCode = json && "error_code" in json ? json.error_code : "UNKNOWN_ERROR";

    // A 401 on an authenticated request means the token is missing, expired,
    // or the account was disabled -- the session is no longer valid, not just
    // this one request. Clear it so AuthGate's existing isAuthenticated check
    // redirects to Login, and flag *why* so Login can tell the user instead of
    // this just looking like a silent failure. Excluded for /api/auth/logout
    // so an intentional logout never shows a confusing "session expired".
    if (auth && response.status === 401 && path !== "/api/auth/logout" && typeof window !== "undefined") {
      clearStoredSession();
      try {
        window.sessionStorage.setItem(SESSION_EXPIRED_FLAG, "1");
      } catch {
        // Storage can be unavailable (private mode, quota) -- the redirect
        // still happens via clearStoredSession(); the message is a bonus.
      }
    }

    throw new ApiError(response.status, errorCode, message);
  }

  return json.data;
}

// ---- Auth ----

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    roles: string[];
    permissions: Partial<Record<Resource, Action[]>>;
  };
}

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>("/api/auth/login", { method: "POST", body: { email, password }, auth: false });

export const logout = () => apiFetch<null>("/api/auth/logout", { method: "POST" });

// ---- Roles ----

export interface RolePermissionEntry {
  resource: Resource;
  action: Action;
}

export interface BackendRole {
  id: number;
  name: string;
  name_ar: string | null;
  description: string | null;
  permissions: RolePermissionEntry[];
}

export interface PermissionRegistry {
  resources: Resource[];
  actions: Action[];
}

export interface RoleWritePayload {
  nameEn: string;
  nameAr: string | null;
  description: string | null;
  permissions: RolePermissionEntry[];
}

export const fetchRoles = () => apiFetch<BackendRole[]>("/api/admin/roles");

export const fetchPermissionRegistry = () => apiFetch<PermissionRegistry>("/api/admin/roles/permissions/registry");

export const createRole = (payload: RoleWritePayload) =>
  apiFetch<BackendRole>("/api/admin/roles", { method: "POST", body: payload });

export const updateRole = (id: number, payload: Omit<RoleWritePayload, "nameEn">) =>
  apiFetch<BackendRole>(`/api/admin/roles/${id}`, { method: "PUT", body: payload });

// ---- Admin users ----

export interface BackendAdminUser {
  id: number;
  name: string;
  email: string;
  status: "invited" | "active";
  roles: string[];
  createdAt: string;
  lastSeenAt: string | null;
  isOnline: boolean;
}

export const fetchUsers = () => apiFetch<BackendAdminUser[]>("/api/admin/users");

export const deleteUser = (id: number) => apiFetch<{ id: number }>(`/api/admin/users/${id}`, { method: "DELETE" });

export interface UserPermissions {
  roles: string[];
  rolePermissions: Partial<Record<Resource, Action[]>>;
  userPermissions: RolePermissionEntry[];
}

export const fetchUserPermissions = (id: number) => apiFetch<UserPermissions>(`/api/admin/users/${id}/permissions`);

export const updateUserPermissions = (id: number, permissions: RolePermissionEntry[]) =>
  apiFetch<UserPermissions>(`/api/admin/users/${id}/permissions`, { method: "PUT", body: { permissions } });

// ---- Invitations ----

export interface CreatedInvitation {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "invited";
  expiresAt: string;
  emailSent: boolean;
}

export const createInvitation = (input: { name: string; email: string; roleId: number }) =>
  apiFetch<CreatedInvitation>("/api/admin/invitations", { method: "POST", body: input });

export interface PendingInvitation {
  id: number;
  name: string;
  email: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
}

export const listInvitations = () => apiFetch<PendingInvitation[]>("/api/admin/invitations");

export interface InvitationDetails {
  name: string;
  email: string;
  role: string;
  expiresAt: string;
}

export const verifyInvitation = (token: string) =>
  apiFetch<InvitationDetails>(`/api/invitations/verify?token=${encodeURIComponent(token)}`, { auth: false });

export const acceptInvitation = (token: string, password: string) =>
  apiFetch<{ email: string }>("/api/invitations/accept", {
    method: "POST",
    body: { token, password },
    auth: false,
  });

// ---- Categories ----

export interface BackendCategory {
  id: number;
  nameAr: string;
  nameEn: string;
  slug: string;
  archived: boolean;
  articleCount: number;
}

export const fetchCategories = () => apiFetch<BackendCategory[]>("/api/admin/categories");

export const createCategory = (input: { nameAr: string; nameEn: string }) =>
  apiFetch<BackendCategory>("/api/admin/categories", { method: "POST", body: input });

export const updateCategory = (id: number, input: { nameAr: string; nameEn: string }) =>
  apiFetch<{ id: number }>(`/api/admin/categories/${id}`, { method: "PUT", body: input });

export const setCategoryArchived = (id: number, archived: boolean) =>
  apiFetch<{ id: number; archived: boolean }>(`/api/admin/categories/${id}/archived`, {
    method: "PATCH",
    body: { archived },
  });

// ---- Tags ----

export interface BackendTag {
  id: number;
  nameAr: string;
  nameEn: string;
  slug: string;
  archived: boolean;
  articleCount: number;
}

export const fetchTags = () => apiFetch<BackendTag[]>("/api/admin/tags");

export const createTag = (input: { nameAr: string; nameEn: string }) =>
  apiFetch<BackendTag>("/api/admin/tags", { method: "POST", body: input });

export const updateTag = (id: number, input: { nameAr: string; nameEn: string }) =>
  apiFetch<{ id: number }>(`/api/admin/tags/${id}`, { method: "PUT", body: input });

export const setTagArchived = (id: number, archived: boolean) =>
  apiFetch<{ id: number; archived: boolean }>(`/api/admin/tags/${id}/archived`, {
    method: "PATCH",
    body: { archived },
  });

// ---- Articles ----

export type ArticleLocale = "ar" | "en";

/** One inline-formatted run of text, produced by the rich-text toolbar. */
export type InlineRun = { text: string; bold?: boolean; italic?: boolean; href?: string };

export type ArticleBlock =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 | 4 | 5 | 6; runs?: InlineRun[]; links?: { label: string; href: string }[] }
  | { type: "paragraph"; text: string; runs?: InlineRun[]; links?: { label: string; href: string }[]; callout?: boolean }
  | { type: "list"; items: string[]; ordered?: boolean; arrow?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "flow"; steps: string[] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "image"; src: string; alt: string; width?: number; height?: number };

export interface ArticleCover {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ArticleSeo {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  robots: "index, follow" | "noindex";
}

export interface ArticleTranslationPayload {
  title: string;
  slug: string;
  excerpt: string;
  content: ArticleBlock[];
  cover?: ArticleCover | null;
  readingTimeMinutes?: number | null;
  seo?: Partial<ArticleSeo>;
  translationStatus?: "not_started" | "in_progress" | "complete";
}

export interface BackendArticleTranslation {
  title: string;
  slug: string;
  excerpt: string;
  content: ArticleBlock[];
  cover: ArticleCover | null;
  readingTimeMinutes: number | null;
  seo: ArticleSeo;
}

export type BackendArticleStatus =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "unpublished"
  | "archived";

export interface BackendArticle {
  id: number;
  status: BackendArticleStatus;
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  authorName: string | null;
  tagIds: number[];
  publishedAt: string | null;
  scheduledFor: string | null;
  rejectionComment: string | null;
  createdAt: string;
  updatedAt: string;
  translations: Record<ArticleLocale, BackendArticleTranslation | null>;
  translationStatus: Record<ArticleLocale, "not_started" | "in_progress" | "complete">;
}

export interface ArticleWritePayload {
  categoryId: number;
  authorName?: string | null;
  tagIds?: number[];
  translations: Partial<Record<ArticleLocale, ArticleTranslationPayload>>;
}

export const fetchArticles = () => apiFetch<BackendArticle[]>("/api/admin/articles");

export const fetchArticle = (id: number) => apiFetch<BackendArticle>(`/api/admin/articles/${id}`);

export const createArticle = (input: ArticleWritePayload) =>
  apiFetch<BackendArticle>("/api/admin/articles", { method: "POST", body: input });

export const updateArticle = (id: number, input: Partial<ArticleWritePayload>) =>
  apiFetch<BackendArticle>(`/api/admin/articles/${id}`, { method: "PUT", body: input });

export const deleteArticle = (id: number) => apiFetch<{ id: number }>(`/api/admin/articles/${id}`, { method: "DELETE" });

export type ArticleWorkflowAction = "submit_review" | "approve" | "reject" | "schedule" | "publish" | "unpublish" | "archive";

export const transitionArticleStatus = (
  id: number,
  action: ArticleWorkflowAction,
  extra?: { comment?: string; scheduledFor?: string }
) =>
  apiFetch<BackendArticle>(`/api/admin/articles/${id}/status`, {
    method: "PATCH",
    body: { action, ...extra },
  });

// ---- Pricing ----
export type PricingPendingStatus = "draft" | "review" | "rejected";
export interface BackendPricingPlan { id:number; nameAr:string; nameEn:string|null; descriptionAr:string; descriptionEn:string|null; price:number; priceLabelAr:string|null; currency:string; billingPeriod:string; featuresAr:string[]; featuresEn:string[]|null; ctaTextAr:string; ctaTextEn:string|null; ctaTarget:string; badgeAr:string|null; badgeEn:string|null; displayOrder:number; active:boolean; createdAt:string; updatedAt:string; pendingStatus:PricingPendingStatus|null; pendingChanges:Record<string,unknown>|null; rejectionComment:string|null; }
export type PricingWritePayload = Omit<BackendPricingPlan, "id" | "createdAt" | "updatedAt" | "priceLabelAr" | "pendingStatus" | "pendingChanges" | "rejectionComment">;
export const fetchPricingPlans = () => apiFetch<BackendPricingPlan[]>("/api/admin/pricing");
export const createPricingPlan = (input: PricingWritePayload) => apiFetch<BackendPricingPlan>("/api/admin/pricing", { method:"POST", body:input });
export const updatePricingPlan = (id:number, input: PricingWritePayload) => apiFetch<BackendPricingPlan>(`/api/admin/pricing/${id}`, { method:"PUT", body:input });
export const deletePricingPlan = (id:number) => apiFetch<{id:number}>(`/api/admin/pricing/${id}`, { method:"DELETE" });

export type PricingWorkflowAction = "submit_review" | "approve" | "reject";
export const transitionPricingStatus = (id: number, action: PricingWorkflowAction, comment?: string) =>
  apiFetch<BackendPricingPlan>(`/api/admin/pricing/${id}/status`, { method: "PATCH", body: { action, comment } });

// ---- Testimonials ----
export interface BackendTestimonial { id:number; nameAr:string; nameEn:string|null; roleAr:string; roleEn:string|null; quoteAr:string; quoteEn:string|null; rating:number; imageSrc:string|null; displayOrder:number; active:boolean; createdAt:string; updatedAt:string; }
export type TestimonialWritePayload = Omit<BackendTestimonial, "id" | "createdAt" | "updatedAt">;
export const fetchTestimonials = () => apiFetch<BackendTestimonial[]>("/api/admin/testimonials");
export const createTestimonial = (input: TestimonialWritePayload) => apiFetch<BackendTestimonial>("/api/admin/testimonials", { method:"POST", body:input });
export const updateTestimonial = (id:number, input: TestimonialWritePayload) => apiFetch<BackendTestimonial>(`/api/admin/testimonials/${id}`, { method:"PUT", body:input });
export const deleteTestimonial = (id:number) => apiFetch<{id:number}>(`/api/admin/testimonials/${id}`, { method:"DELETE" });

// ---- FAQ ----
export interface BackendFaq { id:number; categoryAr:string; categoryEn:string|null; questionAr:string; questionEn:string|null; answerAr:string; answerEn:string|null; displayOrder:number; active:boolean; createdAt:string; updatedAt:string; }
export type FaqWritePayload = Omit<BackendFaq, "id" | "createdAt" | "updatedAt">;
export const fetchFaqs = () => apiFetch<BackendFaq[]>("/api/admin/faq");
export const createFaq = (input: FaqWritePayload) => apiFetch<BackendFaq>("/api/admin/faq", { method:"POST", body:input });
export const updateFaq = (id:number, input: FaqWritePayload) => apiFetch<BackendFaq>(`/api/admin/faq/${id}`, { method:"PUT", body:input });
export const deleteFaq = (id:number) => apiFetch<{id:number}>(`/api/admin/faq/${id}`, { method:"DELETE" });

// ---- Contact Info ----
export interface ContactSocialLink { id:string; platform:string; url:string; }
export interface BackendContactInfo { whatsappNumber:string|null; whatsappLink:string|null; websiteUrl:string|null; email:string|null; addressAr:string|null; addressEn:string|null; locationAr:string|null; locationEn:string|null; social:ContactSocialLink[]; updatedAt:string; }
export type ContactWritePayload = Omit<BackendContactInfo, "updatedAt">;
export const fetchContactInfo = () => apiFetch<BackendContactInfo>("/api/admin/contact");
export const updateContactInfo = (input: ContactWritePayload) => apiFetch<BackendContactInfo>("/api/admin/contact", { method:"PUT", body:input });
export const deleteContactInfo = () => apiFetch<BackendContactInfo>("/api/admin/contact", { method:"DELETE" });

// ---- Audit Log ----
export interface BackendAuditEntry { id:number; actor:{id:string;name:string}; action:string; resourceType:string; resourceId:string; resourceLabel:string; newValue?:string; timestamp:string; result:"success"|"failure"; }
export const fetchAuditLog = () => apiFetch<BackendAuditEntry[]>("/api/admin/audit");

// ---- Notifications ----
export interface BackendNotification { id:string; icon:string; titleAr:string; detailAr:string; timestamp:string; read:boolean; variant:"info"|"success"|"warning"|"danger"; }
export const fetchNotifications = () => apiFetch<BackendNotification[]>("/api/admin/notifications");
export const markNotificationsRead = () => apiFetch<{readAt:string}>("/api/admin/notifications/read", { method:"PATCH" });

// ---- Pages & Sections ----
export interface BackendPageSection {
  id:number; key:string; titleAr:string|null; titleEn:string|null; bodyAr:string|null; bodyEn:string|null;
  badgeAr:string|null; badgeEn:string|null; ctaLabelAr:string|null; ctaLabelEn:string|null; ctaHref:string|null;
  cta2LabelAr:string|null; cta2LabelEn:string|null; cta2Href:string|null;
  visible:boolean; displayOrder:number; updatedAt:string;
}
export interface BackendPage { id:number; slug:string; titleAr:string; titleEn:string|null; visible:boolean; showInNav:boolean; displayOrder:number; updatedAt:string; }
export interface BackendPageDetail extends BackendPage { sections: BackendPageSection[]; }
export type PageWritePayload = { titleAr:string; titleEn:string|null; visible:boolean; showInNav:boolean; };
export type SectionWritePayload = {
  key?:string; titleAr:string|null; titleEn:string|null; bodyAr:string|null; bodyEn:string|null;
  badgeAr?:string|null; badgeEn?:string|null; ctaLabelAr?:string|null; ctaLabelEn?:string|null; ctaHref?:string|null;
  cta2LabelAr?:string|null; cta2LabelEn?:string|null; cta2Href?:string|null;
  visible:boolean; displayOrder?:number;
};

export const fetchPages = () => apiFetch<BackendPage[]>("/api/admin/pages");
export const fetchPage = (slug:string) => apiFetch<BackendPageDetail>(`/api/admin/pages/${slug}`);
export const updatePage = (slug:string, input: PageWritePayload) => apiFetch<BackendPage>(`/api/admin/pages/${slug}`, { method:"PUT", body:input });
export const createPageSection = (slug:string, input: SectionWritePayload) => apiFetch<BackendPageSection>(`/api/admin/pages/${slug}/sections`, { method:"POST", body:input });
export const updatePageSection = (slug:string, id:number, input: SectionWritePayload) => apiFetch<BackendPageSection>(`/api/admin/pages/${slug}/sections/${id}`, { method:"PUT", body:input });
export const deletePageSection = (slug:string, id:number) => apiFetch<{id:number}>(`/api/admin/pages/${slug}/sections/${id}`, { method:"DELETE" });

// ---- Media ----
export interface BackendMediaUsage { id:number; route:string|null; routeTitleAr:string|null; routeTitleEn:string|null; section:string; }
export interface BackendMedia { id:number; filename:string; url:string; mimeType:string; sizeKb:number; width:number|null; height:number|null; altAr:string; altEn:string; uploadedBy:string|null; createdAt:string; updatedAt:string; usedIn: BackendMediaUsage[]; }
export type MediaUploadPayload = { filename:string; dataUrl:string; altAr:string; altEn:string; width?:number; height?:number; route:string; section:string; };
export type MediaMetaPayload = { altAr:string; altEn:string; };
export type MediaReplacePayload = { filename:string; dataUrl:string; width?:number; height?:number; };

export const fetchMedia = () => apiFetch<BackendMedia[]>("/api/admin/media");
export const createMedia = (input: MediaUploadPayload) => apiFetch<BackendMedia>("/api/admin/media", { method:"POST", body:input });
export const updateMediaMeta = (id:number, input: MediaMetaPayload) => apiFetch<BackendMedia>(`/api/admin/media/${id}`, { method:"PUT", body:input });
export const replaceMedia = (id:number, input: MediaReplacePayload) => apiFetch<BackendMedia>(`/api/admin/media/${id}/replace`, { method:"PUT", body:input });
export const deleteMedia = (id:number) => apiFetch<{id:number}>(`/api/admin/media/${id}`, { method:"DELETE" });
export const removeMediaUsage = (mediaId:number, usageId:number) => apiFetch<BackendMedia>(`/api/admin/media/${mediaId}/usage/${usageId}`, { method:"DELETE" });
export const reassignMediaUsage = (mediaId:number, usageId:number, newMediaId:number) => apiFetch<BackendMedia>(`/api/admin/media/${mediaId}/usage/${usageId}`, { method:"PUT", body:{ mediaId:newMediaId } });
