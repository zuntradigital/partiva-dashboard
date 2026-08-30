"use client";

import { useState } from "react";
import { Modal, Field, Textarea, Button } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";

/** Reject requires a comment — WEB-ADM-FR-036: "Given Reject with no comment entered, when
 * submitted, then the action is blocked until a comment is provided." */
export function RejectModal({
  open,
  onClose,
  onReject,
  itemLabel,
}: {
  open: boolean;
  onClose: () => void;
  onReject: (comment: string) => void;
  itemLabel: string;
}) {
  const { t } = useLanguage();
  const [comment, setComment] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("rejectModal.title")}
      description={t("rejectModal.description", { item: itemLabel })}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={!comment.trim()}
            onClick={() => {
              onReject(comment.trim());
              setComment("");
              onClose();
            }}
          >
            {t("rejectModal.confirmReject")}
          </Button>
        </>
      }
    >
      <Field label={t("rejectModal.reasonLabel")} required hint={t("rejectModal.reasonHint")}>
        <Textarea autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("rejectModal.reasonPlaceholder")} />
      </Field>
    </Modal>
  );
}
