"use client";

import { useState } from "react";
import { Modal, Button, Field, Input, Select } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export function InviteUserModal({
  open,
  roles,
  onClose,
  onCreated,
}: {
  open: boolean;
  roles: api.BackendRole[];
  onClose: () => void;
  onCreated: (invitation: api.CreatedInvitation) => void;
}) {
  const { lang, t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>(roles[0] ? String(roles[0].id) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRoleId(roles[0] ? String(roles[0].id) : "");
    setError(null);
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !roleId) {
      setError(t("inviteModal.fieldsRequired"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const invitation = await api.createInvitation({ name: name.trim(), email: email.trim(), roleId: Number(roleId) });
      onCreated(invitation);

      if (invitation.emailSent) {
        reset();
        onClose();
      } else {
        setError(t("inviteModal.sendError"));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("inviteModal.genericSendError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("inviteModal.title")}
      description={t("inviteModal.description")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("inviteModal.sending") : t("inviteModal.send")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t("inviteModal.nameLabel")} htmlFor="invite-name" required>
          <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("inviteModal.namePlaceholder")} />
        </Field>
        <Field label={t("inviteModal.emailLabel")} htmlFor="invite-email" required>
          <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@partiva.com" />
        </Field>
        <Field label={t("inviteModal.roleLabel")} htmlFor="invite-role" required>
          <Select id="invite-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {lang === "ar" ? role.name_ar || role.name : role.name}
              </option>
            ))}
          </Select>
        </Field>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
