"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Table, THead, TBody, TR, TH, TD, Badge, SearchInput, Select, Field, EmptyState, TableSkeleton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { fetchAuditLog } from "@/lib/api";
import { useSession } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { auditActionLabel, ACTION_LABELS_AR } from "@/lib/status";
import { useLanguage } from "@/lib/i18n";
import type { AuditLogEntry } from "@/types";

const RESOURCE_TYPES = [
  "articles",
  "categories",
  "tags",
  "pricing",
  "testimonials",
  "faq",
  "contact",
  "users",
  "invitations",
  "roles",
  "pages",
  "media",
] as const;
const RESOURCE_LABEL_KEYS: Record<(typeof RESOURCE_TYPES)[number], string> = {
  articles: "auditLog.resArticle",
  categories: "auditLog.resCategory",
  tags: "auditLog.resTag",
  pricing: "auditLog.resPricing",
  testimonials: "auditLog.resTestimonial",
  faq: "auditLog.resFaq",
  contact: "auditLog.resContact",
  users: "auditLog.resUser",
  invitations: "auditLog.resInvitation",
  roles: "auditLog.resRole",
  pages: "auditLog.resPage",
  media: "auditLog.resMedia",
};

export default function AuditLogPage() {
  const { can } = useSession();
  const { lang, t } = useLanguage();
  const canView = can("audit_log", "view");
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<string>("all");
  const [resourceType, setResourceType] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (!canView) return;
    void fetchAuditLog()
      .then((data) => setEntries(data as unknown as AuditLogEntry[]))
      .catch(() => setLoadError(t("auditLog.loadError")));
  }, [canView, t]);

  const filtered = useMemo(
    () =>
      [...(entries ?? [])]
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
        .filter((e) => (action === "all" ? true : e.action === action))
        .filter((e) => (resourceType === "all" ? true : e.resourceType === resourceType))
        .filter((e) => e.actor.name.includes(query) || e.resourceLabel.includes(query)),
    [entries, query, action, resourceType],
  );

  // Filters/search changed the result set -- start back at the first page.
  useEffect(() => {
    setVisibleCount(10);
  }, [query, action, resourceType]);

  const visible = filtered.slice(0, visibleCount);

  function resourceLabelFor(resourceType: string): string {
    const key = RESOURCE_LABEL_KEYS[resourceType as (typeof RESOURCE_TYPES)[number]];
    return key ? t(key) : resourceType;
  }

  if (!canView) {
    return <EmptyState icon="audit" title={t("common.unauthorizedTitle")} description={t("auditLog.unauthorizedDesc")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("auditLog.title")} description={t("auditLog.description")} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("auditLog.searchPlaceholder")}
            className="sm:max-w-xs"
          />
          <Field label="" className="w-full sm:w-40">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="all">{t("auditLog.allActions")}</option>
              {Object.keys(ACTION_LABELS_AR).map((key) => (
                <option key={key} value={key}>
                  {auditActionLabel(key as keyof typeof ACTION_LABELS_AR, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="" className="w-full sm:w-40">
            <Select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              <option value="all">{t("auditLog.allResources")}</option>
              {RESOURCE_TYPES.map((r) => (
                <option key={r} value={r}>
                  {resourceLabelFor(r)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {entries === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("auditLog.loadError")} description={loadError} />
          ) : (
            <TableSkeleton rows={8} cols={6} />
          )
        ) : filtered.length === 0 ? (
          <EmptyState icon="audit" title={t("auditLog.noMatches")} />
        ) : (
          <>
            {/* Mobile/small screens: stacked cards -- a 6-column table has no
                room to breathe below md, so each entry becomes a self-contained
                card with the action/result up top and secondary details below. */}
            <ul className="divide-y divide-border-soft md:hidden">
              {visible.map((entry) => (
                <li key={entry.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="info">{auditActionLabel(entry.action, lang)}</Badge>
                    {entry.result === "success" ? (
                      <Badge variant="success">
                        <Icon name="check" className="h-3 w-3" /> {t("auditLog.success")}
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <Icon name="alert" className="h-3 w-3" /> {t("auditLog.failure")}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{entry.resourceLabel}</p>
                    <p className="text-xs text-muted-soft">{resourceLabelFor(entry.resourceType)}</p>
                  </div>
                  {(entry.previousValue || entry.newValue) && (
                    <div className="rounded-lg bg-background-soft p-2 text-xs text-muted">
                      {entry.previousValue && entry.newValue ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="break-words text-danger line-through">{entry.previousValue}</span>
                          <span>←</span>
                          <span className="break-words text-success">{entry.newValue}</span>
                        </div>
                      ) : (
                        <p className="break-words">{entry.newValue}</p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-soft">
                    <span>{entry.actor.name}</span>
                    <span>{formatDateTime(entry.timestamp, lang)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet/desktop: full table */}
            <div className="hidden md:block">
              <Table className="table-fixed">
                <THead>
                  <tr>
                    <TH className="w-[12%]">{t("auditLog.timeCol")}</TH>
                    <TH className="w-[10%]">{t("auditLog.userCol")}</TH>
                    <TH className="w-[12%]">{t("auditLog.actionCol")}</TH>
                    <TH className="w-[14%]">{t("auditLog.itemCol")}</TH>
                    <TH className="w-[38%]">{t("auditLog.changeCol")}</TH>
                    <TH className="w-[14%]">{t("auditLog.resultCol")}</TH>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="truncate text-muted" title={formatDateTime(entry.timestamp, lang)}>
                        {formatDateTime(entry.timestamp, lang)}
                      </TD>
                      <TD className="truncate font-medium text-foreground" title={entry.actor.name}>
                        {entry.actor.name}
                      </TD>
                      <TD className="truncate">
                        <Badge variant="info">{auditActionLabel(entry.action, lang)}</Badge>
                      </TD>
                      <TD className="min-w-0" title={entry.resourceLabel}>
                        <p className="truncate text-foreground">{entry.resourceLabel}</p>
                        <p className="truncate text-[11px] text-muted-soft">{resourceLabelFor(entry.resourceType)}</p>
                      </TD>
                      <TD className="min-w-0 text-xs text-muted">
                        {entry.previousValue && entry.newValue ? (
                          <div className="flex min-w-0 items-center gap-1" title={`${entry.previousValue} ← ${entry.newValue}`}>
                            <span className="min-w-0 flex-1 truncate text-danger line-through">{entry.previousValue}</span>
                            <span className="shrink-0">←</span>
                            <span className="min-w-0 flex-1 truncate text-success">{entry.newValue}</span>
                          </div>
                        ) : entry.newValue ? (
                          <p className="truncate" title={entry.newValue}>
                            {entry.newValue}
                          </p>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="truncate">
                        {entry.result === "success" ? (
                          <Badge variant="success">
                            <Icon name="check" className="h-3 w-3" /> {t("auditLog.success")}
                          </Badge>
                        ) : (
                          <Badge variant="danger">
                            <Icon name="alert" className="h-3 w-3" /> {t("auditLog.failure")}
                          </Badge>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
        {filtered.length > visibleCount && (
          <div className="flex justify-center border-t border-border p-4">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 10)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("auditLog.viewMore")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
