"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { Locale } from "@/types";

/** Preview system — SRS Section 22. Preview ≠ Publish (WEB-ADM-FR-102): a persistent banner
 * distinguishes it from the live site. Supports RTL/LTR per locale (WEB-ADM-FR-072) and a
 * mobile-viewport mode (WEB-ADM-FR-101). */
export function PreviewModal({
  open,
  onClose,
  title,
  locale,
  onLocaleChange,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  locale: Locale;
  onLocaleChange?: (locale: Locale) => void;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 bg-warning px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-black">
          <Icon name="eye" className="h-4 w-4" />
          <span>{t("previewModal.banner")}</span>
        </div>
        <button onClick={onClose} className="rounded-lg bg-black/10 p-1.5 text-black hover:bg-black/20" aria-label={t("previewModal.closeAria")}>
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border-soft bg-surface px-4 py-2.5">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <div className="flex items-center gap-3">
          {onLocaleChange && (
            <div className="flex items-center gap-1 rounded-lg bg-background-soft p-1">
              {(["ar", "en"] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => onLocaleChange(l)}
                  className={cn("rounded-md px-2.5 py-1 text-xs font-medium", locale === l ? "bg-gradient-brand text-white" : "text-muted")}
                >
                  {l === "ar" ? "AR" : "EN"}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg bg-background-soft p-1">
            <button
              onClick={() => setViewport("desktop")}
              className={cn("rounded-md px-2.5 py-1 text-xs", viewport === "desktop" ? "bg-gradient-brand text-white" : "text-muted")}
            >
              {t("previewModal.desktop")}
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={cn("rounded-md px-2.5 py-1 text-xs", viewport === "mobile" ? "bg-gradient-brand text-white" : "text-muted")}
            >
              {t("previewModal.mobile")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-y-auto p-6">
        <div
          dir={locale === "ar" ? "rtl" : "ltr"}
          className={cn(
            "min-h-[60vh] w-full rounded-2xl border border-border-soft bg-white text-slate-900 shadow-2xl transition-all",
            viewport === "mobile" ? "max-w-sm" : "max-w-4xl",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
