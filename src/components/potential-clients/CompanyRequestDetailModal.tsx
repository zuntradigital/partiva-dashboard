"use client";

import { useState } from "react";
import { Modal, Field, Input, Select, Button, Badge } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { BackendCompanyRequest, CompanyRequestStatus } from "@/lib/api";

const STATUS_VARIANT: Record<CompanyRequestStatus, "info" | "warning" | "success"> = {
  new: "info",
  contacted: "warning",
  closed: "success",
};

const ACTIVITY_LABEL_KEYS: Record<BackendCompanyRequest["businessActivity"], string> = {
  retail: "potentialClients.activityRetail",
  wholesale: "potentialClients.activityWholesale",
  importer: "potentialClients.activityImporter",
  workshop: "potentialClients.activityWorkshop",
};

const STATUS_LABEL_KEYS: Record<CompanyRequestStatus, string> = {
  new: "potentialClients.statusNew",
  contacted: "potentialClients.statusContacted",
  closed: "potentialClients.statusClosed",
};

/** Read-only submission from the Website's /register form, plus one
 * editable field (internal follow-up status/note) -- everything else here
 * is exactly what the visitor submitted, never altered. */
export function CompanyRequestDetailModal({
  request,
  canEdit,
  onClose,
  onSaveStatus,
}: {
  request: BackendCompanyRequest;
  canEdit: boolean;
  onClose: () => void;
  onSaveStatus: (id: number, status: CompanyRequestStatus, adminNote: string) => Promise<void>;
}) {
  const { lang, t } = useLanguage();
  const [status, setStatus] = useState<CompanyRequestStatus>(request.status);
  const [adminNote, setAdminNote] = useState(request.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = status !== request.status || adminNote !== (request.adminNote ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      title={request.tradeName}
      description={t("potentialClients.detailTitle")}
      size="lg"
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t("potentialClients.close")}
            </Button>
            <Button
              variant="primary"
              disabled={!dirty || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSaveStatus(request.id, status, adminNote);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t("potentialClients.saveStatus")}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-soft">{t("potentialClients.crNumberLabel")}</p>
          <p dir="ltr" className="mt-0.5 text-end text-sm text-foreground">
            {request.crNumber}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-soft">{t("potentialClients.activityLabel")}</p>
          <p className="mt-0.5 text-sm text-foreground">{t(ACTIVITY_LABEL_KEYS[request.businessActivity])}</p>
        </div>
        <div>
          <p className="text-xs text-muted-soft">{t("potentialClients.contactNameLabel")}</p>
          <p className="mt-0.5 text-sm text-foreground">{request.contactName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-soft">{t("potentialClients.cityLabel")}</p>
          <p className="mt-0.5 text-sm text-foreground">{request.city || t("potentialClients.notProvided")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-soft">{t("potentialClients.emailLabel")}</p>
          <p dir="ltr" className="mt-0.5 text-end text-sm text-foreground">
            {request.contactEmail}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-soft">{t("potentialClients.phoneLabel")}</p>
          <p dir="ltr" className="mt-0.5 text-end text-sm text-foreground">
            {request.contactPhone}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-soft">{t("potentialClients.submittedAtLabel")}</p>
          <p className="mt-0.5 text-sm text-foreground">{formatDateTime(request.createdAt, lang)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-border-soft pt-5">
        <Field label={t("potentialClients.statusLabel")}>
          <Select disabled={!canEdit} value={status} onChange={(e) => setStatus(e.target.value as CompanyRequestStatus)}>
            <option value="new">{t("potentialClients.statusNew")}</option>
            <option value="contacted">{t("potentialClients.statusContacted")}</option>
            <option value="closed">{t("potentialClients.statusClosed")}</option>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-soft">{t("potentialClients.statusCol")}:</span>
          <Badge variant={STATUS_VARIANT[request.status]}>{t(STATUS_LABEL_KEYS[request.status])}</Badge>
        </div>
        <Field label={t("potentialClients.adminNoteLabel")}>
          <textarea
            disabled={!canEdit}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder={t("potentialClients.adminNotePlaceholder")}
            maxLength={1000}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-soft focus:border-primary/50 disabled:opacity-60"
          />
        </Field>
      </div>
    </Modal>
  );
}
