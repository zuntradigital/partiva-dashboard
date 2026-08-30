"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, CardHeader, CardTitle, ConfirmDialog, Field, Input, Textarea, Switch, Button, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import {
  ApiError,
  createPageSection,
  deletePageSection,
  fetchPage,
  updatePage,
  updatePageSection,
  type BackendPageDetail,
  type BackendPageSection,
} from "@/lib/api";

function SectionCard({
  section,
  slug,
  readOnly,
  highlighted,
  onSaved,
  onDeleted,
}: {
  section: BackendPageSection;
  slug: string;
  readOnly: boolean;
  highlighted: boolean;
  onSaved: (s: BackendPageSection) => void;
  onDeleted: (id: number) => void;
}) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [draft, setDraft] = useState(section);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(section);

  async function persist(next: BackendPageSection) {
    setSaving(true);
    try {
      const saved = await updatePageSection(slug, section.id, {
        titleAr: next.titleAr, titleEn: next.titleEn, bodyAr: next.bodyAr, bodyEn: next.bodyEn,
        badgeAr: next.badgeAr, badgeEn: next.badgeEn,
        ctaLabelAr: next.ctaLabelAr, ctaLabelEn: next.ctaLabelEn, ctaHref: next.ctaHref,
        cta2LabelAr: next.cta2LabelAr, cta2LabelEn: next.cta2LabelEn, cta2Href: next.cta2Href,
        visible: next.visible, displayOrder: next.displayOrder,
      });
      setDraft(saved);
      onSaved(saved);
      showToast("success", t("sectionCard.savedSection"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("sectionCard.saveSectionError"));
    } finally {
      setSaving(false);
    }
  }

  // The visibility switch saves immediately (matching the Route-level
  // switches above it) rather than waiting for the separate "save section"
  // click below, which is easy to miss and made the toggle look like a no-op.
  function toggleVisible(v: boolean) {
    const next = { ...draft, visible: v };
    setDraft(next);
    void persist(next);
  }

  const save = () => persist(draft);

  async function remove() {
    try {
      await deletePageSection(slug, section.id);
      onDeleted(section.id);
      showToast("success", t("sectionCard.deletedSection"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("sectionCard.deleteSectionError"));
    }
  }

  return (
    <Card
      id={`section-${section.id}`}
      className={highlighted ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background transition-shadow duration-700" : undefined}
    >
      <CardHeader>
        <CardTitle>{section.key}</CardTitle>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            {t("sectionCard.visible")}
            <Switch checked={draft.visible} disabled={readOnly || saving} onChange={toggleVisible} />
          </label>
          {!readOnly && (
            <button onClick={() => setConfirmDelete(true)} className="rounded p-1.5 text-danger transition-colors hover:bg-danger/10" aria-label={t("sectionCard.deleteSectionAria")}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <div className="grid grid-cols-1 gap-4 p-5 pt-3 sm:grid-cols-2">
        <Field label={t("sectionCard.titleArLabel")}>
          <Input disabled={readOnly} value={draft.titleAr ?? ""} onChange={(e) => setDraft({ ...draft, titleAr: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.titleEnLabel")}>
          <Input disabled={readOnly} value={draft.titleEn ?? ""} onChange={(e) => setDraft({ ...draft, titleEn: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.bodyArLabel")}>
          <Textarea disabled={readOnly} value={draft.bodyAr ?? ""} onChange={(e) => setDraft({ ...draft, bodyAr: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.bodyEnLabel")}>
          <Textarea disabled={readOnly} value={draft.bodyEn ?? ""} onChange={(e) => setDraft({ ...draft, bodyEn: e.target.value || null })} />
        </Field>
        <p className="sm:col-span-2 text-xs text-muted-soft">{t("sectionCard.bodyListHint")}</p>
        <Field label={t("sectionCard.badgeArLabel")}>
          <Input disabled={readOnly} value={draft.badgeAr ?? ""} onChange={(e) => setDraft({ ...draft, badgeAr: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.badgeEnLabel")}>
          <Input disabled={readOnly} value={draft.badgeEn ?? ""} onChange={(e) => setDraft({ ...draft, badgeEn: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.ctaLabelArLabel")}>
          <Input disabled={readOnly} value={draft.ctaLabelAr ?? ""} onChange={(e) => setDraft({ ...draft, ctaLabelAr: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.ctaLabelEnLabel")}>
          <Input disabled={readOnly} value={draft.ctaLabelEn ?? ""} onChange={(e) => setDraft({ ...draft, ctaLabelEn: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.ctaHrefLabel")}>
          <Input disabled={readOnly} value={draft.ctaHref ?? ""} onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value || null })} placeholder="/register" />
        </Field>
        <div />
        <Field label={t("sectionCard.cta2LabelArLabel")}>
          <Input disabled={readOnly} value={draft.cta2LabelAr ?? ""} onChange={(e) => setDraft({ ...draft, cta2LabelAr: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.cta2LabelEnLabel")}>
          <Input disabled={readOnly} value={draft.cta2LabelEn ?? ""} onChange={(e) => setDraft({ ...draft, cta2LabelEn: e.target.value || null })} />
        </Field>
        <Field label={t("sectionCard.cta2HrefLabel")}>
          <Input disabled={readOnly} value={draft.cta2Href ?? ""} onChange={(e) => setDraft({ ...draft, cta2Href: e.target.value || null })} placeholder="/pricing" />
        </Field>
      </div>
      {!readOnly && (
        <div className="flex justify-end gap-2 border-t border-border-soft p-3">
          <Button size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? t("sectionCard.saving") : t("sectionCard.saveSection")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={t("sectionCard.deleteConfirmTitle")}
        description={t("sectionCard.deleteConfirmDesc")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </Card>
  );
}

export default function PageEditorPage(props: PageProps<"/pages/[slug]">) {
  const { slug } = use(props.params);
  const { can } = useSession();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [page, setPage] = useState<BackendPageDetail | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [savingPage, setSavingPage] = useState(false);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  // Scrolls to and briefly highlights a section right after it's created,
  // since it's appended at the bottom and can otherwise land off-screen
  // with no indication it was added.
  useEffect(() => {
    if (justAddedId == null) return;
    document.getElementById(`section-${justAddedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(() => setJustAddedId(null), 1800);
    return () => clearTimeout(timer);
  }, [justAddedId]);

  const canEdit = can("pages", "edit");

  useEffect(() => {
    fetchPage(slug)
      .then(setPage)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNotFoundFlag(true);
      });
  }, [slug]);

  if (notFoundFlag) notFound();

  if (!page) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <CardTitle>{t("pageEditor.routeSettingsTitle")}</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-6 p-5 pt-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-40" />
          </div>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 p-5 pt-3 sm:grid-cols-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  async function savePageMeta(patch: Partial<BackendPageDetail>) {
    if (!page) return;
    setSavingPage(true);
    try {
      const updated = await updatePage(slug, {
        titleAr: patch.titleAr ?? page.titleAr,
        titleEn: patch.titleEn ?? page.titleEn,
        visible: patch.visible ?? page.visible,
        showInNav: patch.showInNav ?? page.showInNav,
      });
      setPage({ ...page, ...updated });
      showToast("success", t("pageEditor.pageMetaSaved"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("pageEditor.pageMetaSaveError"));
    } finally {
      setSavingPage(false);
    }
  }

  async function addSection() {
    const created = await createPageSection(slug, { key: "custom", titleAr: "", titleEn: "", bodyAr: "", bodyEn: "", visible: true });
    setPage((p) => p && { ...p, sections: [...p.sections, created] });
    setJustAddedId(created.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/pages" className="hover:text-foreground">
          {t("pageEditor.breadcrumb")}
        </Link>
        <Icon name="chevron-left" className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{page.titleAr}</span>
      </div>

      <PageHeader title={page.titleAr} description={`/${page.slug}`} />

      <Card>
        <CardHeader>
          <CardTitle>{t("pageEditor.routeSettingsTitle")}</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-6 p-5 pt-3">
          <label className="flex items-center gap-2 text-sm">
            {t("pageEditor.visibleOnSite")}
            <Switch checked={page.visible} disabled={!canEdit || savingPage} onChange={(v) => savePageMeta({ visible: v })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t("pageEditor.inNavigation")}
            <Switch checked={page.showInNav} disabled={!canEdit || savingPage} onChange={(v) => savePageMeta({ showInNav: v })} />
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">{t("pageEditor.sectionsTitle")}</h2>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={addSection}>
            <Icon name="plus" className="h-3.5 w-3.5" /> {t("pageEditor.addSection")}
          </Button>
        )}
      </div>

      {page.sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-soft p-6 text-center text-sm text-muted-soft">{t("pageEditor.noSections")}</p>
      ) : (
        <div className="space-y-4">
          {page.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              slug={slug}
              readOnly={!canEdit}
              highlighted={section.id === justAddedId}
              onSaved={(s) => setPage((p) => p && { ...p, sections: p.sections.map((x) => (x.id === s.id ? s : x)) })}
              onDeleted={(id) => setPage((p) => p && { ...p, sections: p.sections.filter((x) => x.id !== id) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
