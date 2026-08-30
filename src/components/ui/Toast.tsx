"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";

export interface ToastItem {
  id: string;
  variant: "success" | "danger" | "warning" | "info";
  message: string;
}

const VARIANT_CLASSES: Record<ToastItem["variant"], string> = {
  success: "border-success/30 bg-surface-soft text-success",
  danger: "border-danger/30 bg-surface-soft text-danger",
  warning: "border-warning/30 bg-surface-soft text-warning",
  info: "border-info/30 bg-surface-soft text-info",
};

const VARIANT_ICON: Record<ToastItem["variant"], "check" | "alert"> = {
  success: "check",
  danger: "alert",
  warning: "alert",
  info: "alert",
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        "animate-toast-in flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-2xl",
        VARIANT_CLASSES[toast.variant],
      )}
    >
      <Icon name={VARIANT_ICON[toast.variant]} className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-sm font-medium text-foreground">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-muted transition-colors hover:text-foreground" aria-label={t("common.close")}>
        <Icon name="close" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((t) => (
        <div key={t.id} className="w-full max-w-sm">
          <ToastCard toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
