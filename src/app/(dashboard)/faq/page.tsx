"use client";
import { useEffect, useState } from "react";
import { Button, Card, Modal, ConfirmDialog, PageHeader, TableSkeleton, EmptyState, ToastViewport } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import { ApiError, createFaq, deleteFaq, fetchFaqs, type BackendFaq, type FaqWritePayload, updateFaq } from "@/lib/api";

const blank = (): FaqWritePayload => ({ categoryAr: "", categoryEn: null, questionAr: "", questionEn: null, answerAr: "", answerEn: null, displayOrder: 0, active: true });
const write = (f: BackendFaq | FaqWritePayload): FaqWritePayload => ({ categoryAr: f.categoryAr, categoryEn: f.categoryEn, questionAr: f.questionAr, questionEn: f.questionEn, answerAr: f.answerAr, answerEn: f.answerEn, displayOrder: f.displayOrder, active: f.active });
type Draft = BackendFaq | FaqWritePayload;

export default function FaqPage() {
  const { can } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<BackendFaq[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackendFaq | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editable = can("faq", "edit");
  const creatable = can("faq", "create");
  const deletable = can("faq", "delete");

  const fields = [
    ["categoryAr", t("faq.fieldCategory")],
    ["categoryEn", t("faq.fieldCategoryEn")],
    ["questionAr", t("faq.fieldQuestion")],
    ["questionEn", t("faq.fieldQuestionEn")],
    ["displayOrder", t("faq.fieldOrder")],
  ] as const;

  useEffect(() => {
    void fetchFaqs().then(setItems).catch((e) => setLoadError(e.message));
  }, []);

  const close = () => {
    if (!saving) {
      setDraft(null);
      setError("");
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const input = write(draft);
      const saved = "id" in draft ? await updateFaq(draft.id, input) : await createFaq(input);
      setItems((list) => ("id" in draft ? (list ?? []).map((f) => (f.id === saved.id ? saved : f)) : [...(list ?? []), saved]));
      setNotice(t("faq.savedSuccess"));
      setDraft(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("faq.saveError"));
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(target: BackendFaq) {
    try {
      await deleteFaq(target.id);
      setItems((list) => (list ?? []).filter((x) => x.id !== target.id));
      showToast("success", t("faq.deleteSuccess"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("faq.deleteError"));
    }
  }

  const isNew = draft && !("id" in draft);
  const canSave = Boolean(draft && (isNew ? creatable : editable));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("faq.title")}
        description={t("faq.description")}
        actions={creatable ? <Button onClick={() => { setError(""); setDraft(blank()); }}>{t("faq.newQuestion")}</Button> : undefined}
      />
      {notice && <p className="rounded-lg bg-success/10 p-3 text-sm text-success">{notice}</p>}
      {error && !draft && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <Card>
        {items === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("faq.loadError")} description={loadError} />
          ) : (
            <TableSkeleton rows={5} cols={3} />
          )
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">{t("faq.noneYet")}</p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {items.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{f.questionAr}</p>
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-muted">{f.categoryAr}</span>
                    {!f.active && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">{t("faq.inactive")}</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{f.answerAr}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setError(""); setDraft(f); }}>{editable ? t("faq.edit") : t("faq.view")}</Button>
                  {deletable && (
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDeleteTarget(f)}>
                      {t("faq.delete")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(draft)}
        onClose={close}
        title={isNew ? t("faq.addTitle") : t("faq.editTitle")}
        description={t("faq.editDescription")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>{t("faq.cancel")}</Button>
            <Button onClick={save} disabled={!canSave || saving}>{saving ? t("faq.saving") : t("faq.saveChanges")}</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-foreground">
                  {label}
                  <input
                    disabled={!canSave || saving}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                    value={String(draft[key] ?? "")}
                    onChange={(e) => setDraft({ ...draft, [key]: key === "displayOrder" ? Number(e.target.value) : e.target.value || null })}
                  />
                </label>
              ))}
            </div>

            <label className="block text-sm font-medium text-foreground">
              {t("faq.answerLabel")}
              <textarea
                disabled={!canSave || saving}
                className="mt-1.5 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={draft.answerAr}
                onChange={(e) => setDraft({ ...draft, answerAr: e.target.value })}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              {t("faq.answerEnLabel")}
              <textarea
                disabled={!canSave || saving}
                className="mt-1.5 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={draft.answerEn ?? ""}
                onChange={(e) => setDraft({ ...draft, answerEn: e.target.value || null })}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border-soft bg-background-soft px-4 py-3 text-sm">
              <span>{t("faq.activeOnSite")}</span>
              <input type="checkbox" disabled={!canSave || saving} checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            </label>
          </div>
        )}
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
          title={t("faq.deleteConfirmTitle")}
          description={t("faq.deleteConfirmDesc")}
          confirmLabel={t("faq.delete")}
          variant="danger"
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
