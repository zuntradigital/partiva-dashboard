"use client";

import { Field, CharCounter, Input, Textarea, PermissionNotice } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import type { SeoMetadata } from "@/types";

const TITLE_MAX = 60;
const DESC_MAX = 160;

/** SEO Management editor — SRS Section 14. Character-limit enforcement (WEB-ADM-FR-065),
 * structured data is system-generated and never manually overridable (WEB-ADM-FR-066),
 * robots stays locked where the platform deliberately excludes a page (WEB-ADM-FR-067). */
export function SeoEditor({
  seo,
  onChange,
  readOnly,
}: {
  seo: SeoMetadata;
  onChange: (next: SeoMetadata) => void;
  readOnly?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      {readOnly && <PermissionNotice message={t("seoEditor.readOnlyNotice")} />}

      <Field label={t("seoEditor.titleLabel")} required trailing={<CharCounter value={seo.title.length} max={TITLE_MAX} />}>
        <Input
          value={seo.title}
          maxLength={TITLE_MAX + 20}
          disabled={readOnly}
          onChange={(e) => onChange({ ...seo, title: e.target.value })}
          className={seo.title.length > TITLE_MAX ? "border-danger" : undefined}
        />
      </Field>

      <Field label={t("seoEditor.descriptionLabel")} required trailing={<CharCounter value={seo.description.length} max={DESC_MAX} />}>
        <Textarea
          value={seo.description}
          disabled={readOnly}
          onChange={(e) => onChange({ ...seo, description: e.target.value })}
          className={seo.description.length > DESC_MAX ? "border-danger" : undefined}
        />
      </Field>

      <Field label={t("seoEditor.canonicalLabel")} hint={t("seoEditor.canonicalHint")}>
        <Input value={seo.canonical || t("seoEditor.canonicalAuto")} disabled className="text-muted" />
      </Field>

      <Field label={t("seoEditor.robotsLabel")} hint={seo.robotsLocked ? t("seoEditor.robotsLockedHint") : undefined}>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background-soft px-3.5 py-2.5 text-sm text-foreground">
          {seo.robotsLocked && <Icon name="lock" className="h-3.5 w-3.5 text-muted-soft" />}
          <span>{seo.robots}</span>
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("seoEditor.ogTitleLabel")}>
          <Input value={seo.ogTitle} disabled={readOnly} onChange={(e) => onChange({ ...seo, ogTitle: e.target.value })} />
        </Field>
        <Field label={t("seoEditor.ogDescriptionLabel")}>
          <Input value={seo.ogDescription} disabled={readOnly} onChange={(e) => onChange({ ...seo, ogDescription: e.target.value })} />
        </Field>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border-soft bg-background-soft px-4 py-3 text-xs text-muted">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("seoEditor.schemaNotice")}</span>
      </div>
    </div>
  );
}
