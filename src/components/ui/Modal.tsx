"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const { t } = useLanguage();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus into the dialog when it opens, and restore it to whatever
  // triggered it when it closes -- without this, focus silently stays on
  // (or behind) the trigger button, invisible under the overlay.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previouslyFocusedRef.current?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-overlay-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "animate-scale-in relative w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface-soft shadow-2xl outline-none",
          SIZE_CLASSES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "primary",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
}) {
  const { t } = useLanguage();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    />
  );
}
