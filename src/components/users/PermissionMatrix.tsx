"use client";

import { Table, THead, TBody, TR, TH, TD } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ROLE_DEFINITIONS, roleLabel } from "@/lib/rbac";
import { resourceLabel } from "@/lib/permission-labels";
import { useLanguage } from "@/lib/i18n";
import type { Resource } from "@/types";

const RESOURCES: Resource[] = [
  "pages",
  "articles",
  "categories_tags",
  "pricing",
  "pricing_publish",
  "faq",
  "testimonials",
  "testimonials_verify",
  "navigation",
  "footer",
  "contact_info",
  "media",
  "seo",
  "roles_permissions",
  "audit_log",
];

const ROLES = Object.values(ROLE_DEFINITIONS);

export function PermissionMatrix() {
  const { lang, t } = useLanguage();

  function hasAccess(role: (typeof ROLES)[number], resource: Resource): boolean {
    const wildcard = (role.permissions as Record<string, string[]>)["*"];
    const actions = wildcard ?? role.permissions[resource] ?? [];
    return actions.length > 0;
  }

  return (
    <>
      {/* Mobile: each resource becomes a card listing per-role access, so the
          grid never needs to scroll horizontally to be read. */}
      <ul className="divide-y divide-border-soft md:hidden">
        {RESOURCES.map((resource) => (
          <li key={resource} className="p-4">
            <p className="mb-2 font-medium text-foreground">{resourceLabel(resource, lang)}</p>
            <div className="space-y-1.5">
              {ROLES.map((role) => (
                <div key={role.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{roleLabel(role.id, lang)}</span>
                  {hasAccess(role, resource) ? (
                    <Icon name="check" className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <span className="text-muted-soft">—</span>
                  )}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet/desktop: full matrix table */}
      <div className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <TH>{t("matrix.resourceCol")}</TH>
              {ROLES.map((r) => (
                <TH key={r.id} className="text-center">
                  {roleLabel(r.id, lang)}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {RESOURCES.map((resource) => (
              <TR key={resource}>
                <TD className="font-medium">{resourceLabel(resource, lang)}</TD>
                {ROLES.map((role) => (
                  <TD key={role.id} className="text-center">
                    {hasAccess(role, resource) ? (
                      <Icon name="check" className="mx-auto h-3.5 w-3.5 text-success" />
                    ) : (
                      <span className="text-muted-soft">—</span>
                    )}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
