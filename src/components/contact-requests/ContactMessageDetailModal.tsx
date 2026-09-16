"use client";

import { useState } from "react";
import { Modal, Field, Select, Button, Badge } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { BackendContactMessage, ContactMessageStatus } from "@/lib/api";

const STATUS_VARIANT: Record<ContactMessageStatus, "info" | "warning" | "success"> = {
  new: "info",
  read: "warning",
  replied: "success",
};

const STATUS_LABEL_KEYS: Record<ContactMessageStatus, string> = {
  new: "contactRequests.statusNew",
  read: "contactRequests.statusRead",
  replied: "contactRequests.statusReplied",
};

const INQUIRY_LABEL_KEYS: Record<BackendContactMessage["inquiryType"], string> = {
  sales: "contactRequests.inquirySales",
  support: "contactRequests.inquirySupport",
  partnership: "contactRequests.inquiryPartnership",
  press: "contactRequests.inquiryPress",
  other: "contactRequests.inquiryOther",
};

/** Read-only submission from the Website's /contact form, plus one editable
 * field (follow-up status) -- everything else is exactly what the visitor sent. */
export function ContactMessageDetailModal({
  message,
  canEdit,
  onClose,
  onSaveStatus,
}: {
  message: BackendContactMessage;
  canEdit: boolean;
  onClose: () => void;
  onSaveStatus: (id: number, status: ContactMessageStatus) => Promise<void>;
}) {
  const { lang, t } = useLanguage();
  const [status, setStatus] = useState<ContactMessageStatus>(message.status);
  const [saving, setSaving] = useState(false);

  const dirty = status !== message.status;

  return (
    <Modal
      open
      onClose={onClose}
      title={message.fullName}
      description={t("contactRequests.detailTitle")}
      size="lg"
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t("contactRequests.close")}
            </Button>
            <Button
              variant="primary"
              disabled={!dirty || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSaveStatus(message.id, status);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t("contactRequests.saveStatus")}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-soft">{t("contactRequests.emailLabel")}</p>
          <p dir="ltr" className="mt-0.5 text-end text-sm text-foreground">
            {message.email}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-soft">{t("contactRequests.phoneLabel")}</p>
          <p dir="ltr" className="mt-0.5 text-end text-sm text-foreground">
            {message.phone || t("contactRequests.notProvided")}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-soft">{t("contactRequests.inquiryTypeLabel")}</p>
          <p className="mt-0.5 text-sm text-foreground">{t(INQUIRY_LABEL_KEYS[message.inquiryType])}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-soft">{t("contactRequests.messageLabel")}</p>
          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-background-soft p-3 text-sm leading-relaxed text-foreground">{message.message}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-soft">{t("contactRequests.submittedAtLabel")}</p>
          <p className="mt-0.5 text-sm text-foreground">{formatDateTime(message.createdAt, lang)}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 border-t border-border-soft pt-5">
        <Field label={t("contactRequests.statusLabel")}>
          <Select disabled={!canEdit} value={status} onChange={(e) => setStatus(e.target.value as ContactMessageStatus)}>
            <option value="new">{t("contactRequests.statusNew")}</option>
            <option value="read">{t("contactRequests.statusRead")}</option>
            <option value="replied">{t("contactRequests.statusReplied")}</option>
          </Select>
        </Field>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-soft">{t("contactRequests.statusCol")}:</span>
          <Badge variant={STATUS_VARIANT[message.status]}>{t(STATUS_LABEL_KEYS[message.status])}</Badge>
        </div>
      </div>
    </Modal>
  );
}
