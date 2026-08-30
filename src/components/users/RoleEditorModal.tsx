"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Field, Input } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { actionLabel, resourceLabel } from "@/lib/permission-labels";
import { useLanguage } from "@/lib/i18n";

function permKey(resource: string, action: string): string {
  return `${resource}|${action}`;
}

export function RoleEditorModal({
  open,
  role,
  registry,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** undefined = create a new role; provided = editing this existing role. */
  role: api.BackendRole | undefined;
  registry: api.PermissionRegistry | null;
  onClose: () => void;
  onSaved: (role: api.BackendRole) => void;
}) {
  const { lang, t } = useLanguage();
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNameEn(role?.name ?? "");
    setNameAr(role?.name_ar ?? "");
    setDescription(role?.description ?? "");
    setSelected(new Set((role?.permissions ?? []).map((p) => permKey(p.resource, p.action))));
    setError(null);
  }, [open, role]);

  function toggle(resource: string, action: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = permKey(resource, action);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit() {
    if (!role && !nameEn.trim()) {
      setError(t("roleModal.nameEnRequired"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const permissions = [...selected].map((key) => {
        const [resource, action] = key.split("|") as [api.RolePermissionEntry["resource"], api.RolePermissionEntry["action"]];
        return { resource, action };
      });
      const saved = role
        ? await api.updateRole(role.id, { nameAr: nameAr.trim() || null, description: description.trim() || null, permissions })
        : await api.createRole({ nameEn: nameEn.trim(), nameAr: nameAr.trim() || null, description: description.trim() || null, permissions });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("roleModal.saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={role ? t("roleModal.editTitle", { name: role.name_ar ?? role.name }) : t("roleModal.addTitle")}
      description={t("roleModal.description")}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("roleModal.saving") : t("roleModal.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("roleModal.nameEnLabel")} htmlFor="role-name-en" required={!role}>
            <Input
              id="role-name-en"
              value={nameEn}
              disabled={Boolean(role)}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Content Reviewer"
            />
          </Field>
          <Field label={t("roleModal.nameArLabel")} htmlFor="role-name-ar">
            <Input id="role-name-ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مراجع المحتوى" />
          </Field>
        </div>
        <Field label={t("roleModal.descriptionLabel")} htmlFor="role-description">
          <Input
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("roleModal.descriptionPlaceholder")}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">{t("roleModal.permissionsLabel")}</p>
          {!registry ? (
            <p className="text-xs text-muted">{t("roleModal.loadingPermissions")}</p>
          ) : (
            <div className="space-y-3 rounded-xl border border-border-soft">
              {registry.resources.map((resource) => (
                <div key={resource} className="border-b border-border-soft px-4 py-3 last:border-b-0">
                  <p className="mb-2 text-xs font-semibold text-muted">{resourceLabel(resource, lang)}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {registry.actions.map((action) => (
                      <label key={action} className="flex items-center gap-1.5 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={selected.has(permKey(resource, action))}
                          onChange={() => toggle(resource, action)}
                        />
                        {actionLabel(action, lang)}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
