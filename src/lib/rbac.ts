import type { Action, AdminUser, Resource, RoleDefinition, RoleName } from "@/types";

/** Recommended Default Role Set & Permission Model — SRS Section 20.
 * Representative matrix, not a final Business decision (WEB-ADM-DEC-020). */
export const ROLE_DEFINITIONS: Record<RoleName, RoleDefinition> = {
  super_admin: {
    id: "super_admin",
    nameAr: "مدير عام",
    nameEn: "Super Admin",
    descriptionAr: "صلاحية كاملة على جميع أجزاء لوحة التحكم، بما في ذلك الأدوار والصلاحيات وسجل التدقيق",
    descriptionEn: "Full access to all Admin Dashboard functionality, including Roles/Permissions and the Audit Log",
    permissions: { "*": ["view", "create", "edit", "submit_review", "approve", "publish", "archive", "delete"] } as never,
  },
  editor: {
    id: "editor",
    nameAr: "المحرر",
    nameEn: "Editor",
    descriptionAr: "إدارة ونشر الصفحات والمقالات والأسئلة الشائعة وآراء العملاء والتنقل والتذييل ومعلومات التواصل والتسعير",
    descriptionEn: "Manages and publishes Pages, Articles, FAQ, Testimonials, Navigation, Footer, Contact Info, and Pricing",
    permissions: {
      pages: ["view", "create", "edit", "approve", "publish", "archive"],
      articles: ["view", "create", "edit", "approve", "publish", "archive", "delete"],
      categories_tags: ["view", "create", "edit", "archive"],
      faq: ["view", "create", "edit", "approve", "publish", "archive"],
      testimonials: ["view", "create", "edit", "approve", "publish", "archive"],
      navigation: ["view", "edit"],
      footer: ["view", "edit"],
      contact_info: ["view", "edit"],
      media: ["view", "create", "edit", "delete"],
      seo: ["view", "edit"],
      pricing: ["view", "create", "edit", "delete", "approve"],
    },
  },
  author: {
    id: "author",
    nameAr: "الكاتب",
    nameEn: "Author",
    descriptionAr: "إنشاء وتحرير المحتوى كمسودة وإرساله للمراجعة، دون صلاحية الاعتماد أو النشر",
    descriptionEn: "Creates and edits Draft content; submits for review; cannot Approve or Publish",
    permissions: {
      pages: ["view", "create", "edit", "submit_review"],
      articles: ["view", "create", "edit", "submit_review"],
      categories_tags: ["view"],
      faq: ["view", "create", "edit", "submit_review"],
      testimonials: ["view", "create", "edit"],
      media: ["view", "create"],
      seo: ["view"],
    },
  },
  sales: {
    id: "sales",
    nameAr: "المبيعات",
    nameEn: "Sales",
    descriptionAr: "تحرير محتوى التسعير ضمن مسودة فقط؛ النشر يتطلب مراجعة المحرر",
    descriptionEn: "Creates and edits Pricing as Draft; submits for review; cannot Publish or Delete",
    permissions: {
      pricing: ["view", "create", "edit", "submit_review"],
      media: ["view"],
    },
  },
};

export function getRolePermissions(role: RoleName): Partial<Record<Resource, Action[]>> {
  return ROLE_DEFINITIONS[role].permissions;
}

export function hasPermission(user: Pick<AdminUser, "roles" | "extraPermissions">, resource: Resource, action: Action): boolean {
  const fromRoles = user.roles.some((role) => {
    const perms = ROLE_DEFINITIONS[role].permissions;
    const wildcard = (perms as Record<string, Action[]>)["*"];
    if (wildcard?.includes(action)) return true;
    return perms[resource]?.includes(action) ?? false;
  });
  if (fromRoles) return true;
  return user.extraPermissions[resource]?.includes(action) ?? false;
}

export function roleLabel(role: RoleName, locale: "ar" | "en" = "ar"): string {
  return locale === "ar" ? ROLE_DEFINITIONS[role].nameAr : ROLE_DEFINITIONS[role].nameEn;
}
