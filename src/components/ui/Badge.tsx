"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { STATUS_VARIANT, statusLabel, TRANSLATION_VARIANT, translationStatusLabel, type BadgeVariant } from "@/lib/status";
import type { ContentStatus, TranslationStatus } from "@/types";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-surface-hover text-muted",
  brand: "bg-secondary/15 text-secondary",
};

export function Badge({ variant = "neutral", className, children }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap", VARIANT_CLASSES[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  const { lang } = useLanguage();
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status, lang)}
    </Badge>
  );
}

export function TranslationBadge({ status, label }: { status: TranslationStatus; label: string }) {
  const { lang } = useLanguage();
  return (
    <Badge variant={TRANSLATION_VARIANT[status]}>
      {label}: {translationStatusLabel(status, lang)}
    </Badge>
  );
}
