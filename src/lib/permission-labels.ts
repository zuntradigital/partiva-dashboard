import type { Action, Resource } from "@/types";
import type { Lang } from "@/lib/i18n";

/** Bilingual labels for the backend's actual permission registry (GET
 * /api/admin/roles/permissions/registry) -- resources/actions outside this
 * map (e.g. rbac.ts's aspirational pricing_publish/seo/navigation) simply
 * fall back to their raw key, since they don't appear in real API data. */
export const RESOURCE_LABELS_AR: Partial<Record<Resource, string>> = {
  pages: "الصفحات",
  articles: "المقالات",
  categories_tags: "التصنيفات والوسوم",
  pricing: "التسعير",
  pricing_publish: "التسعير (نشر)",
  faq: "الأسئلة الشائعة",
  testimonials: "آراء العملاء",
  testimonials_verify: "توثيق آراء العملاء",
  navigation: "التنقل",
  footer: "التذييل",
  contact_info: "معلومات التواصل",
  media: "الوسائط",
  seo: "SEO",
  roles_permissions: "الأدوار والصلاحيات",
  audit_log: "سجل التدقيق",
};

const RESOURCE_LABELS_EN: Partial<Record<Resource, string>> = {
  pages: "Pages",
  articles: "Articles",
  categories_tags: "Categories & Tags",
  pricing: "Pricing",
  pricing_publish: "Pricing (publish)",
  faq: "FAQ",
  testimonials: "Testimonials",
  testimonials_verify: "Testimonials verification",
  navigation: "Navigation",
  footer: "Footer",
  contact_info: "Contact Info",
  media: "Media",
  seo: "SEO",
  roles_permissions: "Roles & Permissions",
  audit_log: "Audit Log",
};

export const ACTION_LABELS_AR: Partial<Record<Action, string>> = {
  view: "مشاهدة",
  create: "إنشاء",
  edit: "تعديل",
  submit_review: "إرسال للمراجعة",
  approve: "اعتماد",
  publish: "نشر",
  archive: "أرشفة",
  delete: "حذف",
};

const ACTION_LABELS_EN: Partial<Record<Action, string>> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  submit_review: "Submit for review",
  approve: "Approve",
  publish: "Publish",
  archive: "Archive",
  delete: "Delete",
};

export function resourceLabel(resource: string, lang: Lang = "ar"): string {
  const map = lang === "ar" ? RESOURCE_LABELS_AR : RESOURCE_LABELS_EN;
  return map[resource as Resource] ?? resource;
}

export function actionLabel(action: string, lang: Lang = "ar"): string {
  const map = lang === "ar" ? ACTION_LABELS_AR : ACTION_LABELS_EN;
  return map[action as Action] ?? action;
}

export function permissionLabel(resource: string, action: string, lang: Lang = "ar"): string {
  return `${actionLabel(action, lang)} ${resourceLabel(resource, lang)}`;
}
