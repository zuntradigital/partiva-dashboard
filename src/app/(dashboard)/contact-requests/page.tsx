"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, Table, THead, TBody, TR, TH, TD, Badge, SearchInput, Select, Field, EmptyState, TableSkeleton, ToastViewport } from "@/components/ui";
import { fetchContactMessages, updateContactMessageStatus, ApiError, type BackendContactMessage, type ContactMessageStatus } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { formatDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { ContactMessageDetailModal } from "@/components/contact-requests/ContactMessageDetailModal";

const STATUS_VARIANT: Record<ContactMessageStatus, "info" | "warning" | "success"> = {
  new: "info",
  read: "warning",
  replied: "success",
};
const STATUS_LABEL_KEYS: Record<ContactMessageStatus, string> = {
  new: "contactRequests.statusNew",
  read: "contactRequests.statusRead",
  replied: "contactRequests.statusReplied",
};
const INQUIRY_LABEL_KEYS: Record<BackendContactMessage["inquiryType"], string> = {
  sales: "contactRequests.inquirySales",
  support: "contactRequests.inquirySupport",
  partnership: "contactRequests.inquiryPartnership",
  press: "contactRequests.inquiryPress",
  other: "contactRequests.inquiryOther",
};

type StatusFilter = "all" | ContactMessageStatus;

export default function ContactRequestsPage() {
  const { can } = useSession();
  const { lang, t } = useLanguage();
  const { toasts, showToast, dismissToast } = useToast();

  const canView = can("contact_messages", "view");
  const canEdit = can("contact_messages", "edit");

  const [messages, setMessages] = useState<BackendContactMessage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!canView) return;
    void fetchContactMessages()
      .then(setMessages)
      .catch(() => setLoadError(t("contactRequests.loadError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const filtered = useMemo(
    () =>
      [...(messages ?? [])]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .filter((m) => (status === "all" ? true : m.status === status))
        .filter(
          (m) =>
            m.fullName.toLowerCase().includes(query.toLowerCase()) ||
            m.email.toLowerCase().includes(query.toLowerCase()) ||
            m.message.toLowerCase().includes(query.toLowerCase()),
        ),
    [messages, query, status],
  );

  useEffect(() => {
    setVisibleCount(10);
  }, [query, status]);

  const visible = filtered.slice(0, visibleCount);
  const selected = messages?.find((m) => m.id === selectedId) ?? null;

  async function handleSaveStatus(id: number, nextStatus: ContactMessageStatus) {
    try {
      const updated = await updateContactMessageStatus(id, nextStatus);
      setMessages((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)));
      showToast("success", t("contactRequests.statusUpdated"));
      setSelectedId(null);
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("contactRequests.statusUpdateError"));
    }
  }

  if (!canView) {
    return <EmptyState icon="send" title={t("common.unauthorizedTitle")} description={t("contactRequests.unauthorizedDesc")} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("contactRequests.title")} description={t("contactRequests.description")} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("contactRequests.searchPlaceholder")} className="sm:max-w-xs" />
          <Field label="" className="w-full sm:w-44">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="all">{t("contactRequests.allStatuses")}</option>
              <option value="new">{t("contactRequests.statusNew")}</option>
              <option value="read">{t("contactRequests.statusRead")}</option>
              <option value="replied">{t("contactRequests.statusReplied")}</option>
            </Select>
          </Field>
          <p className="text-xs text-muted-soft sm:ms-auto">{t("contactRequests.messageCount", { count: filtered.length })}</p>
        </div>

        {messages === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("contactRequests.loadError")} description={loadError} />
          ) : (
            <TableSkeleton rows={8} cols={5} />
          )
        ) : filtered.length === 0 ? (
          <EmptyState icon="send" title={t("contactRequests.noMatchTitle")} description={t("contactRequests.noMatchDesc")} />
        ) : (
          <>
            {/* Mobile/small screens: stacked cards */}
            <ul className="divide-y divide-border-soft md:hidden">
              {visible.map((m) => (
                <li key={m.id} className="cursor-pointer space-y-2 p-4 transition-colors hover:bg-surface-hover" onClick={() => setSelectedId(m.id)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{m.fullName}</p>
                    <Badge variant={STATUS_VARIANT[m.status]}>{t(STATUS_LABEL_KEYS[m.status])}</Badge>
                  </div>
                  <p className="text-xs text-muted-soft">{t(INQUIRY_LABEL_KEYS[m.inquiryType])}</p>
                  <p className="truncate text-xs text-muted-soft">{m.message}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-soft">
                    <span dir="ltr">{m.email}</span>
                    <span>{formatDateTime(m.createdAt, lang)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet/desktop: full table */}
            <div className="hidden md:block">
              <Table className="table-fixed">
                <THead>
                  <tr>
                    <TH className="w-[20%]">{t("contactRequests.nameCol")}</TH>
                    <TH className="w-[14%]">{t("contactRequests.inquiryCol")}</TH>
                    <TH className="w-[34%]">{t("contactRequests.messageCol")}</TH>
                    <TH className="w-[16%]">{t("contactRequests.dateCol")}</TH>
                    <TH className="w-[16%]">{t("contactRequests.statusCol")}</TH>
                  </tr>
                </THead>
                <TBody>
                  {visible.map((m) => (
                    <TR key={m.id} className="cursor-pointer" onClick={() => setSelectedId(m.id)}>
                      <TD className="min-w-0" title={`${m.fullName} — ${m.email}`}>
                        <p className="truncate text-foreground">{m.fullName}</p>
                        <p dir="ltr" className="truncate text-[11px] text-muted-soft">
                          {m.email}
                        </p>
                      </TD>
                      <TD className="truncate">{t(INQUIRY_LABEL_KEYS[m.inquiryType])}</TD>
                      <TD className="min-w-0 truncate text-muted" title={m.message}>
                        {m.message}
                      </TD>
                      <TD className="truncate text-muted" title={formatDateTime(m.createdAt, lang)}>
                        {formatDateTime(m.createdAt, lang)}
                      </TD>
                      <TD className="truncate">
                        <Badge variant={STATUS_VARIANT[m.status]}>{t(STATUS_LABEL_KEYS[m.status])}</Badge>
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
              {t("contactRequests.viewMore")}
            </button>
          </div>
        )}
      </Card>

      {selected && (
        <ContactMessageDetailModal message={selected} canEdit={canEdit} onClose={() => setSelectedId(null)} onSaveStatus={handleSaveStatus} />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
