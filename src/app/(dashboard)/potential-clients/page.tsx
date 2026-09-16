"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Table, THead, TBody, TR, TH, TD, Badge, SearchInput, Select, Field, EmptyState, TableSkeleton, ToastViewport } from "@/components/ui";
import { fetchCompanyRequests, updateCompanyRequestStatus, ApiError, type BackendCompanyRequest, type CompanyRequestStatus } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { formatDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { CompanyRequestDetailModal } from "@/components/potential-clients/CompanyRequestDetailModal";

const STATUS_VARIANT: Record<CompanyRequestStatus, "info" | "warning" | "success"> = {
  new: "info",
  contacted: "warning",
  closed: "success",
};
const STATUS_LABEL_KEYS: Record<CompanyRequestStatus, string> = {
  new: "potentialClients.statusNew",
  contacted: "potentialClients.statusContacted",
  closed: "potentialClients.statusClosed",
};
const ACTIVITY_LABEL_KEYS: Record<BackendCompanyRequest["businessActivity"], string> = {
  retail: "potentialClients.activityRetail",
  wholesale: "potentialClients.activityWholesale",
  importer: "potentialClients.activityImporter",
  workshop: "potentialClients.activityWorkshop",
};

type StatusFilter = "all" | CompanyRequestStatus;

export default function PotentialClientsPage() {
  const { can } = useSession();
  const { lang, t } = useLanguage();
  const { toasts, showToast, dismissToast } = useToast();

  const canView = can("company_requests", "view");
  const canEdit = can("company_requests", "edit");

  const [requests, setRequests] = useState<BackendCompanyRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function reload() {
    void fetchCompanyRequests()
      .then(setRequests)
      .catch(() => setLoadError(t("potentialClients.loadError")));
  }

  useEffect(() => {
    if (!canView) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const filtered = useMemo(
    () =>
      [...(requests ?? [])]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .filter((r) => (status === "all" ? true : r.status === status))
        .filter(
          (r) =>
            r.tradeName.toLowerCase().includes(query.toLowerCase()) ||
            r.contactEmail.toLowerCase().includes(query.toLowerCase()) ||
            r.crNumber.includes(query) ||
            r.contactName.toLowerCase().includes(query.toLowerCase()),
        ),
    [requests, query, status],
  );

  useEffect(() => {
    setVisibleCount(10);
  }, [query, status]);

  const visible = filtered.slice(0, visibleCount);
  const selected = requests?.find((r) => r.id === selectedId) ?? null;

  async function handleSaveStatus(id: number, nextStatus: CompanyRequestStatus, adminNote: string) {
    try {
      const updated = await updateCompanyRequestStatus(id, nextStatus, adminNote);
      setRequests((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)));
      showToast("success", t("potentialClients.statusUpdated"));
      setSelectedId(null);
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("potentialClients.statusUpdateError"));
    }
  }

  if (!canView) {
    return <EmptyState icon="users" title={t("common.unauthorizedTitle")} description={t("potentialClients.unauthorizedDesc")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("potentialClients.title")} description={t("potentialClients.description")} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("potentialClients.searchPlaceholder")} className="sm:max-w-xs" />
          <Field label="" className="w-full sm:w-44">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="all">{t("potentialClients.allStatuses")}</option>
              <option value="new">{t("potentialClients.statusNew")}</option>
              <option value="contacted">{t("potentialClients.statusContacted")}</option>
              <option value="closed">{t("potentialClients.statusClosed")}</option>
            </Select>
          </Field>
          <p className="text-xs text-muted-soft sm:ms-auto">{t("potentialClients.requestCount", { count: filtered.length })}</p>
        </div>

        {requests === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("potentialClients.loadError")} description={loadError} />
          ) : (
            <TableSkeleton rows={8} cols={5} />
          )
        ) : filtered.length === 0 ? (
          <EmptyState icon="users" title={t("potentialClients.noMatchTitle")} description={t("potentialClients.noMatchDesc")} />
        ) : (
          <>
            {/* Mobile/small screens: stacked cards */}
            <ul className="divide-y divide-border-soft md:hidden">
              {visible.map((r) => (
                <li key={r.id} className="cursor-pointer space-y-2 p-4 transition-colors hover:bg-surface-hover" onClick={() => setSelectedId(r.id)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{r.tradeName}</p>
                    <Badge variant={STATUS_VARIANT[r.status]}>{t(STATUS_LABEL_KEYS[r.status])}</Badge>
                  </div>
                  <p className="text-xs text-muted-soft">{t(ACTIVITY_LABEL_KEYS[r.businessActivity])}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-soft">
                    <span dir="ltr">{r.contactEmail}</span>
                    <span>{formatDateTime(r.createdAt, lang)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet/desktop: full table */}
            <div className="hidden md:block">
              <Table className="table-fixed">
                <THead>
                  <tr>
                    <TH className="w-[24%]">{t("potentialClients.tradeNameCol")}</TH>
                    <TH className="w-[28%]">{t("potentialClients.contactCol")}</TH>
                    <TH className="w-[16%]">{t("potentialClients.activityCol")}</TH>
                    <TH className="w-[16%]">{t("potentialClients.dateCol")}</TH>
                    <TH className="w-[16%]">{t("potentialClients.statusCol")}</TH>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((r) => (
                    <TR key={r.id} className="cursor-pointer" onClick={() => setSelectedId(r.id)}>
                      <TD className="min-w-0" title={r.tradeName}>
                        <p className="truncate text-foreground">{r.tradeName}</p>
                        <p dir="ltr" className="truncate text-[11px] text-muted-soft">
                          {r.crNumber}
                        </p>
                      </TD>
                      <TD className="min-w-0" title={`${r.contactName} — ${r.contactEmail}`}>
                        <p className="truncate text-foreground">{r.contactName}</p>
                        <p dir="ltr" className="truncate text-[11px] text-muted-soft">
                          {r.contactEmail}
                        </p>
                      </TD>
                      <TD className="truncate">{t(ACTIVITY_LABEL_KEYS[r.businessActivity])}</TD>
                      <TD className="truncate text-muted" title={formatDateTime(r.createdAt, lang)}>
                        {formatDateTime(r.createdAt, lang)}
                      </TD>
                      <TD className="truncate">
                        <Badge variant={STATUS_VARIANT[r.status]}>{t(STATUS_LABEL_KEYS[r.status])}</Badge>
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
            <button type="button" onClick={() => setVisibleCount((v) => v + 10)} className="text-sm font-medium text-primary hover:underline">
              {t("potentialClients.viewMore")}
            </button>
          </div>
        )}
      </Card>

      {selected && (
        <CompanyRequestDetailModal request={selected} canEdit={canEdit} onClose={() => setSelectedId(null)} onSaveStatus={handleSaveStatus} />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
