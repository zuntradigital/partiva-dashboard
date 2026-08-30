"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  Button,
  Modal,
  Field,
  Input,
  Dropdown,
  EmptyState,
  TableSkeleton,
  ToastViewport,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";

type Taxonomy = api.BackendCategory | api.BackendTag;

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function TaxonomyTable({
  title,
  items,
  canManage,
  onArchive,
  onCreate,
}: {
  title: string;
  items: Taxonomy[] | null;
  canManage: boolean;
  onArchive: (id: number) => void;
  onCreate: (nameAr: string, nameEn: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      await onCreate(nameAr.trim(), nameEn.trim() || nameAr.trim());
      setNameAr("");
      setNameEn("");
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("taxonomy.createError"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            <Icon name="plus" className="h-4 w-4" /> {t("taxonomy.new")}
          </Button>
        )}
      </CardHeader>

      {items === null ? (
        <TableSkeleton rows={3} cols={4} />
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-border-soft md:hidden">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{item.nameAr}</p>
                  <p className="text-xs text-muted-soft">{item.nameEn}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.slug} · {t("taxonomy.colArticleCount")}: {item.articleCount}
                  </p>
                  <div className="mt-2">
                    <Badge variant={item.archived ? "neutral" : "success"}>{item.archived ? t("taxonomy.archived") : t("taxonomy.active")}</Badge>
                  </div>
                </div>
                {canManage && !item.archived && (
                  <Dropdown
                    actions={[
                      {
                        label: item.articleCount > 0 ? t("taxonomy.archiveInUse") : t("taxonomy.archive"),
                        icon: "archive",
                        onClick: () => onArchive(item.id),
                      },
                    ]}
                  />
                )}
              </li>
            ))}
          </ul>

          {/* Tablet/desktop: full table */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>{t("taxonomy.colName")}</TH>
                  <TH>{t("taxonomy.colSlug")}</TH>
                  <TH>{t("taxonomy.colArticleCount")}</TH>
                  <TH>{t("common.status")}</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <p className="font-medium text-foreground">{item.nameAr}</p>
                      <p className="text-xs text-muted-soft">{item.nameEn}</p>
                    </TD>
                    <TD className="text-muted">{item.slug}</TD>
                    <TD className="text-muted">{item.articleCount}</TD>
                    <TD>
                      <Badge variant={item.archived ? "neutral" : "success"}>{item.archived ? t("taxonomy.archived") : t("taxonomy.active")}</Badge>
                    </TD>
                    <TD>
                      {canManage && !item.archived && (
                        <Dropdown
                          actions={[
                            {
                              label: item.articleCount > 0 ? t("taxonomy.archiveInUse") : t("taxonomy.archive"),
                              icon: "archive",
                              onClick: () => onArchive(item.id),
                            },
                          ]}
                        />
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("taxonomy.newItem", { title })}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" disabled={!nameAr.trim() || creating} onClick={handleCreate}>
              {creating ? t("taxonomy.creating") : t("taxonomy.create")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t("taxonomy.nameArLabel")} required>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </Field>
          <Field label={t("taxonomy.nameEnLabel")}>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </Field>
          {nameAr && (
            <p className="text-xs text-muted-soft">
              {t("taxonomy.suggestedSlug")} <span className="text-foreground">{slugify(nameEn || nameAr)}</span>
            </p>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </Modal>
    </Card>
  );
}

export default function CategoriesTagsPage() {
  const { can } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const { t } = useLanguage();
  const canView = can("categories_tags", "view");
  const canManage = can("categories_tags", "edit") || can("categories_tags", "create");

  const [categories, setCategories] = useState<api.BackendCategory[] | null>(null);
  const [tags, setTags] = useState<api.BackendTag[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    Promise.all([api.fetchCategories(), api.fetchTags()])
      .then(([c, t]) => {
        if (cancelled) return;
        setCategories(c);
        setTags(t);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : t("categoriesPage.loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [canView, t]);

  if (!canView) {
    return <EmptyState icon="shield" title={t("categoriesPage.unauthorizedTitle")} description={t("categoriesPage.unauthorizedDesc")} />;
  }

  if (loadError) {
    return <EmptyState icon="alert" title={t("categoriesPage.loadErrorTitle")} description={loadError} />;
  }

  async function archiveCategory(id: number) {
    try {
      await api.setCategoryArchived(id, true);
      setCategories((prev) => prev?.map((c) => (c.id === id ? { ...c, archived: true } : c)) ?? prev);
      showToast("success", t("categoriesPage.archiveSuccess"));
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("categoriesPage.archiveError"));
    }
  }

  async function archiveTag(id: number) {
    try {
      await api.setTagArchived(id, true);
      setTags((prev) => prev?.map((t) => (t.id === id ? { ...t, archived: true } : t)) ?? prev);
      showToast("success", t("categoriesPage.archiveSuccess"));
    } catch (err) {
      showToast("danger", err instanceof ApiError ? err.message : t("categoriesPage.archiveError"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/blog" className="hover:text-foreground">
          {t("blog.title")}
        </Link>
        <Icon name="chevron-left" className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{t("categoriesPage.breadcrumb")}</span>
      </div>

      <PageHeader title={t("categoriesPage.title")} description={t("categoriesPage.description")} />

      <TaxonomyTable
        title={t("categoriesPage.categoriesTitle")}
        items={categories}
        canManage={canManage}
        onArchive={archiveCategory}
        onCreate={async (nameAr, nameEn) => {
          const created = await api.createCategory({ nameAr, nameEn });
          setCategories((prev) => (prev ? [...prev, created] : [created]));
          showToast("success", t("categoriesPage.categoryCreated"));
        }}
      />

      <TaxonomyTable
        title={t("categoriesPage.tagsTitle")}
        items={tags}
        canManage={canManage}
        onArchive={archiveTag}
        onCreate={async (nameAr, nameEn) => {
          const created = await api.createTag({ nameAr, nameEn });
          setTags((prev) => (prev ? [...prev, created] : [created]));
          showToast("success", t("categoriesPage.tagCreated"));
        }}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
