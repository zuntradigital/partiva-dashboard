import type { AuditAction, ContentStatus, TranslationStatus } from "@/types";
import type { Lang } from "@/lib/i18n";

export type BadgeVariant = "success" | "info" | "warning" | "danger" | "neutral" | "brand";

export const STATUS_LABELS_AR: Record<ContentStatus, string> = {
  draft: "مسودة",
  review: "قيد المراجعة",
  approved: "معتمد",
  scheduled: "مجدول",
  published: "منشور",
  unpublished: "غير منشور",
  archived: "مؤرشف",
};

const STATUS_LABELS_EN: Record<ContentStatus, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
};

export function statusLabel(status: ContentStatus, lang: Lang = "ar"): string {
  return lang === "ar" ? STATUS_LABELS_AR[status] : STATUS_LABELS_EN[status];
}

export const STATUS_VARIANT: Record<ContentStatus, BadgeVariant> = {
  draft: "neutral",
  review: "warning",
  approved: "info",
  scheduled: "brand",
  published: "success",
  unpublished: "danger",
  archived: "neutral",
};

export const TRANSLATION_LABELS_AR: Record<TranslationStatus, string> = {
  not_started: "لم تبدأ",
  in_progress: "قيد التنفيذ",
  complete: "مكتملة",
};

const TRANSLATION_LABELS_EN: Record<TranslationStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

export function translationStatusLabel(status: TranslationStatus, lang: Lang = "ar"): string {
  return lang === "ar" ? TRANSLATION_LABELS_AR[status] : TRANSLATION_LABELS_EN[status];
}

export const TRANSLATION_VARIANT: Record<TranslationStatus, BadgeVariant> = {
  not_started: "danger",
  in_progress: "warning",
  complete: "success",
};

export const ACTION_LABELS_AR: Record<AuditAction, string> = {
  create: "إنشاء",
  edit: "تعديل",
  publish: "نشر",
  unpublish: "إلغاء نشر",
  archive: "أرشفة",
  delete: "حذف",
  approve: "اعتماد",
  reject: "رفض",
  verify: "توثيق",
  permission_change: "تغيير صلاحية",
  upload: "رفع ملف",
  login: "تسجيل دخول",
  schedule: "جدولة",
  submit_review: "إرسال للمراجعة",
};

const ACTION_LABELS_EN: Record<AuditAction, string> = {
  create: "Create",
  edit: "Edit",
  publish: "Publish",
  unpublish: "Unpublish",
  archive: "Archive",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  verify: "Verify",
  permission_change: "Permission change",
  upload: "Upload",
  login: "Login",
  schedule: "Schedule",
  submit_review: "Submit for review",
};

export function auditActionLabel(action: AuditAction, lang: Lang = "ar"): string {
  return lang === "ar" ? ACTION_LABELS_AR[action] : ACTION_LABELS_EN[action];
}
