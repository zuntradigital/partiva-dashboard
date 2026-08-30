"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Button,
  StatusBadge,
  Badge,
  Field,
  Input,
  Textarea,
  Select,
  PermissionNotice,
  ConfirmDialog,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  ToastViewport,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { SeoEditor } from "@/components/shared/SeoEditor";
import { PreviewModal } from "@/components/shared/PreviewModal";
import { RejectModal } from "@/components/shared/RejectModal";
import { ArticleContentEditor } from "@/components/blog/ArticleContentEditor";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import { auditActionLabel, translationStatusLabel, TRANSLATION_VARIANT } from "@/lib/status";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { ArticleBlock, ArticleLocale, ArticleSeo, ArticleWorkflowAction, BackendArticle } from "@/lib/api";
import type { Lang } from "@/lib/i18n";

type WorkflowActionKey = ArticleWorkflowAction;

const AVAILABLE_TRANSITIONS: Record<BackendArticle["status"], WorkflowActionKey[]> = {
  draft: ["submit_review"],
  review: ["approve", "reject"],
  approved: ["schedule", "publish"],
  scheduled: ["publish"],
  published: ["unpublish", "archive"],
  unpublished: ["publish", "archive"],
  archived: ["publish"],
};

const REQUIRED_PERMISSION: Record<WorkflowActionKey, string> = {
  submit_review: "submit_review",
  approve: "approve",
  reject: "approve",
  schedule: "publish",
  publish: "publish",
  unpublish: "publish",
  archive: "archive",
};

const ACTION_ICON: Record<WorkflowActionKey, "send" | "check" | "close" | "calendar" | "eye" | "archive"> = {
  submit_review: "send",
  approve: "check",
  reject: "close",
  schedule: "calendar",
  publish: "eye",
  unpublish: "eye",
  archive: "archive",
};

const EMPTY_SEO: ArticleSeo = { title: "", description: "", canonical: "", ogTitle: "", ogDescription: "", robots: "index, follow" };

interface EditableTranslation {
  title: string;
  slug: string;
  excerpt: string;
  content: ArticleBlock[];
  coverSrc: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  seo: ArticleSeo;
  translationStatus: "not_started" | "in_progress" | "complete";
}

const EMPTY_TRANSLATION: EditableTranslation = {
  title: "",
  slug: "",
  excerpt: "",
  content: [],
  coverSrc: "",
  coverAlt: "",
  coverWidth: 1200,
  coverHeight: 800,
  seo: { ...EMPTY_SEO },
  translationStatus: "not_started",
};

interface EditableArticle {
  categoryId: number | null;
  authorName: string;
  tagIds: number[];
  translations: Record<ArticleLocale, EditableTranslation | null>;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function fromBackend(article: BackendArticle): EditableArticle {
  const translations = { ar: null, en: null } as Record<ArticleLocale, EditableTranslation | null>;
  for (const locale of ["ar", "en"] as const) {
    const t = article.translations[locale];
    if (!t) continue;
    translations[locale] = {
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt,
      content: t.content,
      coverSrc: t.cover?.src ?? "",
      coverAlt: t.cover?.alt ?? "",
      coverWidth: t.cover?.width ?? 1200,
      coverHeight: t.cover?.height ?? 800,
      seo: t.seo,
      translationStatus: article.translationStatus[locale],
    };
  }
  return { categoryId: article.categoryId, authorName: article.authorName ?? "", tagIds: article.tagIds, translations };
}

function newEditableArticle(defaultCategoryId: number | null): EditableArticle {
  return {
    categoryId: defaultCategoryId,
    authorName: "",
    tagIds: [],
    translations: { ar: { ...EMPTY_TRANSLATION }, en: null },
  };
}

function estimateReadingMinutes(blocks: ArticleBlock[]): number {
  let words = 0;
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
        words += block.text.split(/\s+/).filter(Boolean).length;
        break;
      case "list":
        words += block.items.join(" ").split(/\s+/).filter(Boolean).length;
        break;
      case "flow":
        words += block.steps.join(" ").split(/\s+/).filter(Boolean).length;
        break;
      case "table":
        words += block.rows.flat().join(" ").split(/\s+/).filter(Boolean).length;
        break;
      case "faq":
        words += block.items.map((i) => `${i.q} ${i.a}`).join(" ").split(/\s+/).filter(Boolean).length;
        break;
    }
  }
  return Math.max(1, Math.round(words / 200));
}

// Pre-flight check mirroring the backend's authoritative publish validation
// (articles.service.ts's assertPublishReady) -- this is only a UX
// convenience to show a clear message before sending the request; the
// backend enforces the same rule regardless of what the dashboard sends.
function getPublishBlockers(state: EditableArticle, lang: Lang, t: (key: string, vars?: Record<string, string | number>) => string): string[] {
  const blockers: string[] = [];
  for (const locale of ["ar", "en"] as const) {
    // "بال" already carries the Arabic definite article, so the bare noun goes here.
    const localeWord = lang === "ar" ? (locale === "ar" ? "عربية" : "إنجليزية") : locale === "ar" ? "Arabic" : "English";
    const tr = state.translations[locale];
    if (!tr) {
      blockers.push(t("editor.missingContent", { locale: localeWord }));
      continue;
    }
    if (tr.content.length === 0) blockers.push(t("editor.emptyContent", { locale: localeWord }));
    if (!tr.coverSrc) blockers.push(t("editor.missingCover", { locale: localeWord }));
    if (!tr.seo.title.trim() || !tr.seo.description.trim()) blockers.push(t("editor.incompleteSeo", { locale: localeWord }));
  }
  return blockers;
}

function toPayload(state: EditableArticle): api.ArticleWritePayload {
  const translations: Partial<Record<ArticleLocale, api.ArticleTranslationPayload>> = {};
  for (const locale of ["ar", "en"] as const) {
    const t = state.translations[locale];
    if (!t) continue;
    translations[locale] = {
      title: t.title,
      slug: t.slug,
      excerpt: t.excerpt,
      content: t.content,
      cover: t.coverSrc ? { src: t.coverSrc, alt: t.coverAlt, width: t.coverWidth, height: t.coverHeight } : null,
      readingTimeMinutes: estimateReadingMinutes(t.content),
      seo: t.seo,
      translationStatus: t.translationStatus,
    };
  }
  return { categoryId: state.categoryId!, authorName: state.authorName || null, tagIds: state.tagIds, translations };
}

export function ArticleEditor({
  article: initial,
  categories,
  tags,
}: {
  article?: BackendArticle;
  categories: api.BackendCategory[];
  tags: api.BackendTag[];
}) {
  const router = useRouter();
  const { can } = useSession();
  const { lang, t } = useLanguage();
  const { toasts, showToast, dismissToast } = useToast();

  function actionLabel(action: WorkflowActionKey): string {
    return auditActionLabel(action, lang);
  }

  const [articleId, setArticleId] = useState<number | null>(initial?.id ?? null);
  const isNew = articleId === null;
  const [status, setStatus] = useState<BackendArticle["status"]>(initial?.status ?? "draft");
  const [rejectionComment, setRejectionComment] = useState<string | null>(initial?.rejectionComment ?? null);
  const [state, setState] = useState<EditableArticle>(
    initial ? fromBackend(initial) : newEditableArticle(categories[0]?.id ?? null)
  );
  const [locale, setLocale] = useState<ArticleLocale>("ar");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");
  const [confirmAction, setConfirmAction] = useState<WorkflowActionKey | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Mirrors the backend guard: once an article is past "draft", only a
  // reviewer (who can "approve") may keep editing it -- an Author who can
  // only submit_review may edit just their own drafts.
  const canEdit = (can("articles", "edit") || can("articles", "create")) && (isNew || status === "draft" || can("articles", "approve"));
  const canSeo = can("seo", "edit");

  // Autosave (every 3s): a ref mirror of the latest render's values lets the
  // interval below run on a fixed cadence instead of resetting on every
  // keystroke, while still always seeing fresh values.
  const latestRef = useRef({ state, articleId, canEdit });
  useEffect(() => {
    latestRef.current = { state, articleId, canEdit };
  }, [state, articleId, canEdit]);
  const lastSavedRef = useRef<string | null>(initial ? JSON.stringify(toPayload(state)) : null);
  const savingInFlightRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const { state: current, articleId: currentId, canEdit: editable } = latestRef.current;
      if (!editable || savingInFlightRef.current) return;
      if (!current.categoryId) return; // required field not set yet -- skip silently
      if (Object.values(current.translations).every((t) => !t)) return;

      const payload = toPayload(current);
      const payloadJson = JSON.stringify(payload);
      if (payloadJson === lastSavedRef.current) return; // nothing changed since the last save

      savingInFlightRef.current = true;
      const request = currentId === null ? api.createArticle(payload) : api.updateArticle(currentId, payload);
      request
        .then((result) => {
          lastSavedRef.current = payloadJson;
          setLastSavedAt(new Date());
          if (currentId === null) {
            setArticleId(result.id);
            router.replace(`/blog/${result.id}`, { scroll: false });
          }
        })
        .catch(() => {
          // Silent -- the next tick retries; a toast every 3s would be noisy.
        })
        .finally(() => {
          savingInFlightRef.current = false;
        });
    }, 3000);
    return () => clearInterval(timer);
  }, [router]);
  const transitions = !isNew ? AVAILABLE_TRANSITIONS[status].filter((t) => can("articles", REQUIRED_PERMISSION[t] as never)) : [];

  const translation = state.translations[locale];

  function updateTranslation(patch: Partial<EditableTranslation>) {
    setState((s) => ({
      ...s,
      translations: {
        ...s.translations,
        [locale]: { ...(s.translations[locale] ?? EMPTY_TRANSLATION), ...patch, translationStatus: "in_progress" },
      },
    }));
  }

  function handleCoverUpload(file?: File) {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onload = () => updateTranslation({ coverSrc: src, coverWidth: image.width, coverHeight: image.height });
      image.onerror = () => updateTranslation({ coverSrc: src });
      image.src = src;
    };
    reader.readAsDataURL(file);
  }

  function startTranslation() {
    setState((s) => ({ ...s, translations: { ...s.translations, [locale]: { ...EMPTY_TRANSLATION } } }));
  }

  async function handleSave() {
    if (!state.categoryId) {
      showToast("danger", t("editor.categoryRequired"));
      return;
    }
    if (Object.values(state.translations).every((tr) => !tr)) {
      showToast("danger", t("editor.atLeastOneLocale"));
      return;
    }

    setSaving(true);
    savingInFlightRef.current = true;
    try {
      const payload = toPayload(state);
      if (articleId === null) {
        const created = await api.createArticle(payload);
        lastSavedRef.current = JSON.stringify(payload);
        setLastSavedAt(new Date());
        showToast("success", t("editor.createdDraft"));
        setArticleId(created.id);
        router.push(`/blog/${created.id}`);
      } else {
        const updated = await api.updateArticle(articleId, payload);
        lastSavedRef.current = JSON.stringify(payload);
        setLastSavedAt(new Date());
        setStatus(updated.status);
        showToast("success", t("editor.savedChanges"));
      }
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("editor.saveError"));
    } finally {
      setSaving(false);
      savingInFlightRef.current = false;
    }
  }

  async function runTransition(action: WorkflowActionKey, extra?: { comment?: string; scheduledFor?: string }) {
    if (!articleId) return;
    setTransitioning(true);
    try {
      const updated = await api.transitionArticleStatus(articleId, action, extra);
      setStatus(updated.status);
      setRejectionComment(updated.rejectionComment);
      showToast("success", t("editor.actionSuccess", { action: actionLabel(action) }));
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("editor.actionError"));
    } finally {
      setTransitioning(false);
    }
  }

  function handleTransitionClick(action: WorkflowActionKey) {
    if (action === "publish") {
      const blockers = getPublishBlockers(state, lang, t);
      if (blockers.length > 0) {
        showToast("danger", t("editor.cannotPublish", { reasons: blockers.join(lang === "ar" ? "، " : ", ") }));
        return;
      }
    }
    if (action === "reject") return setRejectOpen(true);
    if (action === "schedule") return setScheduleOpen(true);
    if (action === "unpublish" || action === "archive") return setConfirmAction(action);
    runTransition(action);
  }

  async function handleDelete() {
    if (!articleId) return;
    try {
      await api.deleteArticle(articleId);
      showToast("success", t("editor.deleteSuccess"));
      router.push("/blog");
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("editor.deleteError"));
    }
  }

  const readingTime = translation ? estimateReadingMinutes(translation.content) : 0;
  const canDelete = !isNew && can("articles", "delete");
  const localeLabel = (l: ArticleLocale) => (l === "ar" ? t("editor.localeAr") : t("editor.localeEn"));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/blog" className="hover:text-foreground">
          {t("blog.title")}
        </Link>
        <Icon name="chevron-left" className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{isNew ? t("editor.newArticle") : translation?.title || t("editor.untitled")}</span>
      </div>

      <PageHeader
        title={isNew ? t("editor.newArticle") : translation?.title || t("editor.untitled")}
        description={isNew ? t("editor.newArticleDesc") : undefined}
        actions={
          <>
            {!isNew && <StatusBadge status={status as never} />}
            {canEdit && lastSavedAt && (
              <span className="text-xs text-muted-soft">
                {t("editor.autoSavedAt", {
                  time: lastSavedAt.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }),
                })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!translation}>
              <Icon name="eye" className="h-4 w-4" /> {t("editor.preview")}
            </Button>
            {canEdit && (
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? t("editor.saving") : isNew ? t("editor.saveDraft") : t("editor.saveChanges")}
              </Button>
            )}
            {!isNew &&
              transitions.map((tr) => (
                <Button
                  key={tr}
                  variant={tr === "publish" ? "primary" : tr === "reject" ? "danger" : "secondary"}
                  size="sm"
                  disabled={transitioning}
                  onClick={() => handleTransitionClick(tr)}
                >
                  <Icon name={ACTION_ICON[tr]} className="h-4 w-4" />
                  {tr === "publish" && status === "archived" ? t("editor.republish") : actionLabel(tr)}
                </Button>
              ))}
            {canDelete && (
              <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => setDeleteConfirmOpen(true)}>
                <Icon name="trash" className="h-4 w-4" /> {t("editor.delete")}
              </Button>
            )}
          </>
        }
      />

      {rejectionComment && status === "draft" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{t("editor.rejectedNotice")}</p>
            <p className="mt-0.5">{rejectionComment}</p>
          </div>
        </div>
      )}
      {!canEdit && <PermissionNotice message={t("editor.readOnlyNotice")} />}

      <div className="flex flex-wrap gap-1.5">
        {(["ar", "en"] as ArticleLocale[]).map((l) => {
          const s = state.translations[l]?.translationStatus ?? "not_started";
          return (
            <Badge key={l} variant={TRANSLATION_VARIANT[s]}>
              {localeLabel(l)}: {translationStatusLabel(s, lang)}
            </Badge>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
              {(["ar", "en"] as ArticleLocale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${locale === l ? "bg-gradient-brand text-white" : "text-muted"}`}
                >
                  {localeLabel(l)}
                </button>
              ))}
            </div>

            {!translation ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted">{t("editor.noTranslationYet", { locale: localeLabel(locale) })}</p>
                {canEdit && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={startTranslation}>
                    <Icon name="plus" className="h-4 w-4" /> {t("editor.startTranslation")}
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <Card>
                  <div className="space-y-4 p-5">
                    <Field label={t("editor.titleLabel")} htmlFor="article-title" required>
                      <Input
                        id="article-title"
                        disabled={!canEdit}
                        value={translation.title}
                        onChange={(e) => updateTranslation({ title: e.target.value, slug: translation.slug || slugify(e.target.value) })}
                      />
                    </Field>
                    <Field label={t("editor.slugLabel")} htmlFor="article-slug" hint={t("editor.slugHint")}>
                      <Input id="article-slug" disabled={!canEdit} value={translation.slug} onChange={(e) => updateTranslation({ slug: e.target.value })} />
                    </Field>
                    <Field label={t("editor.excerptLabel")} htmlFor="article-excerpt" hint={t("editor.excerptHint")}>
                      <Textarea id="article-excerpt" disabled={!canEdit} value={translation.excerpt} onChange={(e) => updateTranslation({ excerpt: e.target.value })} />
                    </Field>
                  </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("editor.contentTitle")}</CardTitle>
                    <span className="text-xs text-muted-soft">{t("editor.readingMinutes", { count: readingTime })}</span>
                  </CardHeader>
                  <div className="p-5 pt-3">
                    <ArticleContentEditor
                      blocks={translation.content}
                      onChange={(content) => updateTranslation({ content })}
                      readOnly={!canEdit}
                    />
                    <div className="mt-6 border-t border-border-soft pt-6">
                      <h3 className="mb-4 text-base font-semibold text-foreground">{t("editor.seoSettings")}</h3>
                      <SeoEditor
                        seo={{ ...translation.seo, robotsLocked: false }}
                        readOnly={!canSeo}
                        onChange={(next) => updateTranslation({ seo: next })}
                      />
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("editor.coverImageTitle")}</CardTitle>
                  </CardHeader>
                  <div className="grid grid-cols-1 gap-4 p-5 pt-3 sm:grid-cols-2">
                    <Field label={t("editor.uploadImage")} htmlFor="article-cover-upload">
                      <input
                        id="article-cover-upload"
                        type="file"
                        accept="image/*"
                        disabled={!canEdit}
                        onChange={(event) => {
                          handleCoverUpload(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                        className="block w-full text-sm text-muted file:me-3 file:rounded-lg file:border-0 file:bg-surface-hover file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-border-soft"
                      />
                    </Field>
                    <Field label={t("editor.altLabel")} htmlFor="article-cover-alt">
                      <Input id="article-cover-alt" disabled={!canEdit} value={translation.coverAlt} onChange={(e) => updateTranslation({ coverAlt: e.target.value })} />
                    </Field>
                    {translation.coverSrc && (
                      <div className="sm:col-span-2 overflow-hidden rounded-xl border border-border-soft bg-background-soft">
                        <img src={translation.coverSrc} alt={translation.coverAlt || t("editor.coverPreviewAlt")} className="max-h-64 w-full object-cover" />
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("editor.articleDetailsTitle")}</CardTitle>
              </CardHeader>
              <div className="space-y-4 p-5 pt-3">
                <Field label={t("editor.categoryLabel")} htmlFor="article-category" required>
                  <Select
                    id="article-category"
                    disabled={!canEdit}
                    value={state.categoryId ?? ""}
                    onChange={(e) => setState((s) => ({ ...s, categoryId: Number(e.target.value) }))}
                  >
                    {categories.filter((c) => !c.archived).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("editor.tagsLabel")}>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.filter((t) => !t.archived).map((tg) => {
                      const active = state.tagIds.includes(tg.id);
                      return (
                        <button
                          key={tg.id}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              tagIds: active ? s.tagIds.filter((id2) => id2 !== tg.id) : [...s.tagIds, tg.id],
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            active ? "bg-gradient-brand text-white" : "bg-surface-hover text-muted hover:text-foreground"
                          }`}
                        >
                          {tg.nameAr}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label={t("editor.authorLabel")} htmlFor="article-author" hint={t("editor.authorHint")}>
                  <Input id="article-author" disabled={!canEdit} value={state.authorName} onChange={(e) => setState((s) => ({ ...s, authorName: e.target.value }))} />
                </Field>
              </div>
            </Card>
          </div>
        </div>

      {previewOpen && translation && (
        <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} title={translation.title || t("editor.articlePreviewFallback")} locale={locale} onLocaleChange={setLocale}>
          <article className="p-8">
            {translation.coverAlt && (
              <div className="mb-6 flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                {translation.coverAlt}
              </div>
            )}
            <h1 className="text-3xl font-bold">{translation.title || t("editor.untitled")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {state.authorName || t("editor.noAuthor")} · {t("editor.readingMinutes", { count: readingTime })}
            </p>
            <p className="mt-6 leading-relaxed text-slate-700">{translation.excerpt}</p>
          </article>
        </PreviewModal>
      )}

      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} itemLabel={translation?.title ?? ""} onReject={(comment) => runTransition("reject", { comment })} />

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={t("editor.scheduleTitle")}
        description={t("editor.scheduleDesc")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={!scheduleValue}
              onClick={() => {
                runTransition("schedule", { scheduledFor: new Date(scheduleValue).toISOString() });
                setScheduleOpen(false);
              }}
            >
              {t("editor.schedule")}
            </Button>
          </>
        }
      >
        <Field label={t("editor.schedulePickerLabel")} htmlFor="article-schedule" required>
          <Input id="article-schedule" type="datetime-local" value={scheduleValue} onChange={(e) => setScheduleValue(e.target.value)} />
        </Field>
      </Modal>

      {confirmAction && (
        <ConfirmDialog
          open
          onClose={() => setConfirmAction(null)}
          onConfirm={() => runTransition(confirmAction)}
          title={actionLabel(confirmAction)}
          description={t("editor.transitionConfirmDesc")}
          confirmLabel={actionLabel(confirmAction)}
          variant="danger"
        />
      )}

      {deleteConfirmOpen && (
        <ConfirmDialog
          open
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
          title={t("editor.deleteConfirmTitle")}
          description={t("editor.deleteConfirmDesc")}
          confirmLabel={t("common.delete")}
          variant="danger"
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
