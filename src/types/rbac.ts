/** Recommended Default role set — Section 6 / 20.1. Final set is WEB-ADM-DEC-020 (Open).
 * Editor reviews/publishes content and pricing (was Content Manager); Author
 * drafts content and submits for review (was Editor); Sales drafts pricing
 * and submits for review (was Pricing Manager). SEO Manager was removed. */
export type RoleName =
  | "super_admin"
  | "editor"
  | "author"
  | "sales";

export type Resource =
  | "pages"
  | "articles"
  | "categories_tags"
  | "pricing"
  | "pricing_publish"
  | "faq"
  | "testimonials"
  | "testimonials_verify"
  | "navigation"
  | "footer"
  | "contact_info"
  | "media"
  | "media_delete"
  | "seo"
  | "roles_permissions"
  | "audit_log";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "submit_review"
  | "approve"
  | "publish"
  | "archive"
  | "delete";

export interface RoleDefinition {
  id: RoleName;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  permissions: Partial<Record<Resource, Action[]>>;
}

export type AdminUserStatus = "active" | "invited" | "disabled";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: RoleName[];
  /** Individually-granted permissions layered on top of role permissions — e.g. the
   * distinct "Pricing Publish" (WEB-ADM-FR-026), "Testimonial-verification" (WEB-ADM-FR-079),
   * or legal-content approval (WEB-ADM-FR-020) grants, none of which are implied by a role alone. */
  extraPermissions: Partial<Record<Resource, Action[]>>;
  status: AdminUserStatus;
  avatarInitials: string;
  lastActiveAt: string | null;
  createdAt: string;
}
