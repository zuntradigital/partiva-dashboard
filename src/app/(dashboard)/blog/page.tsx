"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StatusBadge,
  Badge,
  SearchInput,
  Select,
  Field,
  Button,
  Dropdown,
  ConfirmDialog,
  EmptyState,
  TableSkeleton,
  ToastViewport,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { auditActionLabel, statusLabel } from "@/lib/status";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { ArticleWorkflowAction, BackendArticle, BackendCategory } from "@/lib/api";
import { RejectModal } from "@/components/shared/RejectModal";

const STATUS_VALUES: Array<BackendArticle["status"] | "all"> = [
  "all",
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "unpublished",
  "archived",
];

const AVAILABLE_TRANSITIONS: Record<BackendArticle["status"], ArticleWorkflowAction[]> = {
  draft: ["submit_review"],
  review: ["approve", "reject"],
  approved: ["schedule", "publish"],
  scheduled: ["publish"],
  published: ["unpublish", "archive"],
  unpublished: ["publish", "archive"],
  archived: [],
};

const REQUIRED_PERMISSION: Record<ArticleWorkflowAction, string> = {
  submit_review: "submit_review",
  approve: "approve",
  reject: "approve",
  schedule: "publish",
  publish: "publish",
  unpublish: "publish",
  archive: "archive",
};

const ACTION_ICON: Record<ArticleWorkflowAction, "send" | "check" | "close" | "calendar" | "eye" | "archive"> = {
  submit_review: "send",
  approve: "check",
  reject: "close",
  schedule: "calendar",
  publish: "eye",
  unpublish: "eye",
  archive: "archive",
};

const POLL_INTERVAL_MS = 15_000;

export default function BlogListPage() {
  const { can } = useSession();
  const { lang, t } = useLanguage();
  const { toasts, showToast, dismissToast } = useToast();
  const [articles, setArticles] = useState<BackendArticle[] | null>(null);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BackendArticle["status"] | "all">("all");
  const [categoryId, setCategoryId] = useState("all");
  const [rejectTarget, setRejectTarget] = useState<BackendArticle | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ article: BackendArticle; action: ArticleWorkflowAction } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackendArticle | null>(null);

  const canView = can("articles", "view");
  const canCreate = can("articles", "create");
  const canDelete = can("articles", "delete");

  function actionLabel(action: ArticleWorkflowAction): string {
    return auditActionLabel(action, lang);
  }

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    Promise.all([api.fetchArticles(), api.fetchCategories()])
      .then(([a, c]) => {
        if (cancelled) return;
        setArticles(a);
        setCategories(c);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : t("blog.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [canView, t]);

  useEffect(() => {
    if (!canView) return;
    const interval = setInterval(() => {
      api.fetchArticles().then(setArticles).catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [canView]);

  const filtered = useMemo(() => {
    if (!articles) return [];
    return articles
      .filter((a) => (status === "all" ? true : a.status === status))
      .filter((a) => (categoryId === "all" ? true : a.categoryId === Number(categoryId)))
      .filter((a) => {
        const title = a.translations.ar?.title ?? a.translations.en?.title ?? "";
        return title.toLowerCase().includes(query.toLowerCase());
      });
  }, [articles, query, status, categoryId]);

  async function runTransition(article: BackendArticle, action: ArticleWorkflowAction, extra?: { comment?: string }) {
    try {
      const updated = await api.transitionArticleStatus(article.id, action, extra);
      setArticles((prev) => prev?.map((a) => (a.id === article.id ? updated : a)) ?? prev);
      showToast("success", t("blog.actionSuccess", { action: actionLabel(action) }));
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("blog.actionError"));
    }
  }

  function handleAction(article: BackendArticle, action: ArticleWorkflowAction) {
    if (action === "reject") return setRejectTarget(article);
    if (action === "unpublish" || action === "archive") return setConfirmTarget({ article, action });
    runTransition(article, action);
  }

  async function handleDelete(article: BackendArticle) {
    try {
      await api.deleteArticle(article.id);
      setArticles((prev) => prev?.filter((a) => a.id !== article.id) ?? prev);
      showToast("success", t("blog.deleteSuccess"));
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("blog.deleteError"));
    }
  }

  if (!canView) {
    return <EmptyState icon="blog" title={t("blog.unauthorizedTitle")} description={t("blog.unauthorizedDesc")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("blog.title")}
        description={t("blog.description")}
        actions={
          <>
            <Link href="/blog/categories">
              <Button variant="outline" size="sm">
                <Icon name="blog" className="h-4 w-4" /> {t("blog.categoriesTags")}
              </Button>
            </Link>
            {canCreate && (
              <Link href="/blog/new">
                <Button variant="primary" size="sm">
                  <Icon name="plus" className="h-4 w-4" /> {t("blog.newArticle")}
                </Button>
              </Link>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("blog.searchPlaceholder")} className="sm:max-w-xs" />
          <Field label="" className="w-full sm:w-44">
            <Select value={status} onChange={(e) => setStatus(e.target.value as BackendArticle["status"] | "all")}>
              {STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? t("blog.allStatuses") : statusLabel(value, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="" className="w-full sm:w-44">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="all">{t("blog.allCategories")}</option>
              {categories.filter((c) => !c.archived).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {articles === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("blog.loadError")} description={loadError} />
          ) : (
            <TableSkeleton rows={5} cols={6} />
          )
        ) : filtered.length === 0 ? (
          <EmptyState icon="blog" title={t("blog.noMatchTitle")} description={t("blog.noMatchDesc")} />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="divide-y divide-border-soft md:hidden">
              {filtered.map((article) => {
                const title = article.translations.ar?.title ?? article.translations.en?.title ?? t("blog.untitled");
                const transitions = AVAILABLE_TRANSITIONS[article.status].filter((tr) => can("articles", REQUIRED_PERMISSION[tr] as never));
                return (
                  <li key={article.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/blog/${article.id}`} className="block font-medium text-foreground hover:text-primary">
                          {title}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {article.translationStatus.ar !== "complete" && <Badge variant="warning">{t("blog.arIncomplete")}</Badge>}
                          {article.translationStatus.en !== "complete" && <Badge variant="neutral">{t("blog.enIncomplete")}</Badge>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          href={`/blog/${article.id}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </Link>
                        {(transitions.length > 0 || canDelete) && (
                          <Dropdown
                            actions={[
                              ...transitions.map((tr) => ({
                                label: actionLabel(tr),
                                icon: ACTION_ICON[tr],
                                danger: tr === "reject",
                                onClick: () => handleAction(article, tr),
                              })),
                              ...(canDelete
                                ? [{ label: t("blog.deleteFinal"), icon: "trash" as const, danger: true, onClick: () => setDeleteTarget(article) }]
                                : []),
                            ]}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span>{article.categoryNameAr}</span>
                      <span>·</span>
                      <span>{article.authorName || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={article.status as never} />
                      <span className="text-xs text-muted-soft">{formatDate(article.updatedAt, lang)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Tablet/desktop: full table */}
            <div className="hidden md:block">
              <Table className="table-fixed">
                <THead>
                  <tr>
                    <TH className="w-[30%]">{t("blog.colArticle")}</TH>
                    <TH className="w-[17%]">{t("blog.colCategory")}</TH>
                    <TH className="w-[15%]">{t("blog.colAuthor")}</TH>
                    <TH className="w-[13%]">{t("common.status")}</TH>
                    <TH className="w-[15%]">{t("blog.colUpdated")}</TH>
                    <TH className="w-24" />
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((article) => {
                    const title = article.translations.ar?.title ?? article.translations.en?.title ?? t("blog.untitled");
                    const transitions = AVAILABLE_TRANSITIONS[article.status].filter((tr) => can("articles", REQUIRED_PERMISSION[tr] as never));
                    return (
                      <TR key={article.id}>
                        <TD className="max-w-0">
                          <Link href={`/blog/${article.id}`} title={title} className="block truncate font-medium text-foreground hover:text-primary">
                            {title}
                          </Link>
                          <div className="mt-1 flex gap-1.5">
                            {article.translationStatus.ar !== "complete" && <Badge variant="warning">{t("blog.arIncomplete")}</Badge>}
                            {article.translationStatus.en !== "complete" && <Badge variant="neutral">{t("blog.enIncomplete")}</Badge>}
                          </div>
                        </TD>
                        <TD className="truncate text-muted">{article.categoryNameAr}</TD>
                        <TD className="truncate text-muted">{article.authorName || "—"}</TD>
                        <TD className="w-24">
                          <StatusBadge status={article.status as never} />
                        </TD>
                        <TD className="text-muted">{formatDate(article.updatedAt, lang)}</TD>
                        <TD>
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/blog/${article.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
                            >
                              <Icon name="edit" className="h-4 w-4" />
                            </Link>
                            {(transitions.length > 0 || canDelete) && (
                              <Dropdown
                                actions={[
                                  ...transitions.map((tr) => ({
                                    label: actionLabel(tr),
                                    icon: ACTION_ICON[tr],
                                    danger: tr === "reject",
                                    onClick: () => handleAction(article, tr),
                                  })),
                                  ...(canDelete
                                    ? [{ label: t("blog.deleteFinal"), icon: "trash" as const, danger: true, onClick: () => setDeleteTarget(article) }]
                                    : []),
                                ]}
                              />
                            )}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {rejectTarget && (
        <RejectModal
          open
          onClose={() => setRejectTarget(null)}
          itemLabel={rejectTarget.translations.ar?.title ?? rejectTarget.translations.en?.title ?? ""}
          onReject={(comment) => runTransition(rejectTarget, "reject", { comment })}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          open
          onClose={() => setConfirmTarget(null)}
          onConfirm={() => runTransition(confirmTarget.article, confirmTarget.action)}
          title={actionLabel(confirmTarget.action)}
          description={t("blog.transitionConfirmDesc", { action: actionLabel(confirmTarget.action) })}
          confirmLabel={actionLabel(confirmTarget.action)}
          variant="danger"
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
          title={t("blog.deleteConfirmTitle")}
          description={t("blog.deleteConfirmDesc")}
          confirmLabel={t("common.delete")}
          variant="danger"
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
