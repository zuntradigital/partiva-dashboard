"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icons";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { roleLabel } from "@/lib/rbac";
import { roleNameToSlug } from "@/lib/role-mapping";
import { actionLabel, permissionLabel, resourceLabel } from "@/lib/permission-labels";
import { useLanguage } from "@/lib/i18n";
import type { Action, Resource } from "@/types";

function permKey(resource: string, action: string): string {
  return `${resource}|${action}`;
}

function flatten(perms: Partial<Record<Resource, Action[]>>): Set<string> {
  const set = new Set<string>();
  for (const [resource, actions] of Object.entries(perms) as [Resource, Action[]][]) {
    actions.forEach((action) => set.add(permKey(resource, action)));
  }
  return set;
}

export function UserPermissionsModal({
  open,
  user,
  registry,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: api.BackendAdminUser | null;
  registry: api.PermissionRegistry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang, t } = useLanguage();
  const [data, setData] = useState<api.UserPermissions | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setError(null);
    api
      .fetchUserPermissions(user.id)
      .then((res) => {
        setData(res);
        setSelectedExtra(new Set(res.userPermissions.map((p) => permKey(p.resource, p.action))));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("permsModal.loadError")))
      .finally(() => setLoading(false));
  }, [open, user, t]);

  function toggle(resource: string, action: string) {
    setSelectedExtra((prev) => {
      const next = new Set(prev);
      const key = permKey(resource, action);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const permissions = [...selectedExtra].map((key) => {
        const [resource, action] = key.split("|") as [Resource, Action];
        return { resource, action };
      });
      await api.updateUserPermissions(user.id, permissions);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("permsModal.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const roleFromRolesKeys = data ? flatten(data.rolePermissions) : new Set<string>();
  const roleDisplayNames = data
    ? data.roles.map((name) => {
        const slug = roleNameToSlug(name);
        return slug ? roleLabel(slug, lang) : name;
      })
    : [];

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={user ? t("permsModal.titleFor", { name: user.name }) : t("permsModal.titleFallback")}
      description={t("permsModal.description")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || loading || !registry}>
            {saving ? t("permsModal.saving") : t("permsModal.saveExtra")}
          </Button>
        </>
      }
    >
      {loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-foreground">{t("permsModal.roleLabel")}</p>
            <p className="mt-1 text-sm text-muted">{roleDisplayNames.length > 0 ? roleDisplayNames.join("، ") : t("users.noRole")}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">{t("permsModal.rolePermissionsLabel")}</p>
            {roleFromRolesKeys.size === 0 ? (
              <p className="text-xs text-muted-soft">{t("permsModal.noRolePermissions")}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {[...roleFromRolesKeys].map((key) => {
                  const [resource, action] = key.split("|");
                  return (
                    <li key={key} className="flex items-center gap-1.5 text-sm text-foreground">
                      <Icon name="check" className="h-3.5 w-3.5 text-success" />
                      {permissionLabel(resource!, action!, lang)}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">{t("permsModal.extraPermissionsLabel")}</p>
            <p className="mb-2 text-xs text-muted-soft">{t("permsModal.extraPermissionsHint")}</p>
            {!registry ? (
              <p className="text-xs text-muted">{t("permsModal.loadingPermissions")}</p>
            ) : (
              <div className="space-y-3 rounded-xl border border-border-soft">
                {registry.resources.map((resource) => (
                  <div key={resource} className="border-b border-border-soft px-4 py-3 last:border-b-0">
                    <p className="mb-2 text-xs font-semibold text-muted">{resourceLabel(resource, lang)}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {registry.actions.map((action) => {
                        const key = permKey(resource, action);
                        const fromRole = roleFromRolesKeys.has(key);
                        return (
                          <label
                            key={action}
                            className={`flex items-center gap-1.5 text-sm ${fromRole ? "text-muted-soft" : "text-foreground"}`}
                          >
                            <input
                              type="checkbox"
                              checked={fromRole || selectedExtra.has(key)}
                              disabled={fromRole}
                              onChange={() => toggle(resource, action)}
                            />
                            {actionLabel(action, lang)}
                            {fromRole && <span className="text-[10px]">{t("permsModal.fromRole")}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
