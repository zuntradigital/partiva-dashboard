"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Field } from "./Field";
import { Input } from "./Input";
import { useLanguage } from "@/lib/i18n";

// Small reusable replacement for window.prompt() -- collects one line of
// free text via the same Modal chrome as the rest of the app, instead of a
// browser-native dialog.
export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  defaultValue = "",
  confirmLabel,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  function submit() {
    onSubmit(value.trim());
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={submit}>
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      <Field label={label}>
        <Input
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </Field>
    </Modal>
  );
}
