"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Table, THead, TBody, TR, TH, TD, Badge, SearchInput, TableSkeleton, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { fetchPages, type BackendPage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

export default function PagesListPage() {
  const { lang, t } = useLanguage();
  const [pages, setPages] = useState<BackendPage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetchPages()
      .then(setPages)
      .catch(() => setLoadError(t("pagesList.loadError")));
  }, [t]);

  const filtered = useMemo(
    () => (pages ?? []).filter((p) => p.titleAr.includes(query) || p.slug.toLowerCase().includes(query.toLowerCase())),
    [pages, query],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("pagesList.title")} description={t("pagesList.description")} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("pagesList.searchPlaceholder")} className="sm:max-w-xs" />
        </div>

        {pages === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("pagesList.loadError")} description={loadError} />
          ) : (
            <TableSkeleton rows={5} cols={5} />
          )
        ) : (
        <>
          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-border-soft md:hidden">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/pages/${p.slug}`} className="font-medium text-foreground hover:text-primary">
                    {p.titleAr}
                  </Link>
                  <p className="text-xs text-muted-soft">{p.titleEn}</p>
                  <p className="mt-1 text-xs text-muted">/{p.slug}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={p.visible ? "success" : "danger"}>{p.visible ? t("pagesList.visible") : t("pagesList.hidden")}</Badge>
                    {p.showInNav && <Badge variant="brand">{t("pagesList.inNav")}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-soft">{formatDateTime(p.updatedAt, lang)}</p>
                </div>
                <Link
                  href={`/pages/${p.slug}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <Icon name="edit" className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet/desktop: full table */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <TH>{t("pagesList.colPage")}</TH>
                  <TH>{t("pagesList.colSlug")}</TH>
                  <TH>{t("common.status")}</TH>
                  <TH>{t("pagesList.colUpdated")}</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {filtered.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link href={`/pages/${p.slug}`} className="font-medium text-foreground hover:text-primary">
                        {p.titleAr}
                      </Link>
                      <p className="text-xs text-muted-soft">{p.titleEn}</p>
                    </TD>
                    <TD className="text-muted">/{p.slug}</TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={p.visible ? "success" : "danger"}>{p.visible ? t("pagesList.visible") : t("pagesList.hidden")}</Badge>
                        {p.showInNav && <Badge variant="brand">{t("pagesList.inNav")}</Badge>}
                      </div>
                    </TD>
                    <TD className="text-muted">{formatDateTime(p.updatedAt, lang)}</TD>
                    <TD>
                      <Link
                        href={`/pages/${p.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
        )}
      </Card>
    </div>
  );
}
