import type { RoleName } from "@/types";

/** Maps the backend's display-name role strings (partiva-admin-backend `roles` table)
 * to this dashboard's internal RoleName slugs used by rbac.ts's ROLE_DEFINITIONS. */
const ROLE_NAME_TO_SLUG: Record<string, RoleName> = {
  "Super Admin": "super_admin",
  Editor: "editor",
  Author: "author",
  Sales: "sales",
};

export function roleNameToSlug(name: string): RoleName | null {
  return ROLE_NAME_TO_SLUG[name] ?? null;
}

export function roleNamesToSlugs(names: string[]): RoleName[] {
  return names.map(roleNameToSlug).filter((slug): slug is RoleName => slug !== null);
}
