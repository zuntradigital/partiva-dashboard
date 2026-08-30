"use client";
import { useEffect, useState } from "react";
import { Button, Card, Modal, ConfirmDialog, PageHeader, Skeleton, EmptyState, ToastViewport } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import { ApiError, createTestimonial, deleteTestimonial, fetchTestimonials, type BackendTestimonial, type TestimonialWritePayload, updateTestimonial } from "@/lib/api";

const blank = (): TestimonialWritePayload => ({ nameAr: "", nameEn: null, roleAr: "", roleEn: null, quoteAr: "", quoteEn: null, rating: 5, imageSrc: null, displayOrder: 0, active: true });
const write = (t: BackendTestimonial | TestimonialWritePayload): TestimonialWritePayload => ({ nameAr: t.nameAr, nameEn: t.nameEn, roleAr: t.roleAr, roleEn: t.roleEn, quoteAr: t.quoteAr, quoteEn: t.quoteEn, rating: t.rating, imageSrc: t.imageSrc, displayOrder: t.displayOrder, active: t.active });
type Draft = BackendTestimonial | TestimonialWritePayload;

function handleImageFile(file: File | undefined, onDone: (src: string) => void) {
  if (!file?.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => onDone(String(reader.result));
  reader.readAsDataURL(file);
}

export default function TestimonialsPage() {
  const { can } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<BackendTestimonial[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackendTestimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editable = can("testimonials", "edit");
  const creatable = can("testimonials", "create");
  const deletable = can("testimonials", "delete");

  const fields = [
    ["nameAr", t("testimonials.fieldName")],
    ["nameEn", t("testimonials.fieldNameEn")],
    ["roleAr", t("testimonials.fieldRole")],
    ["roleEn", t("testimonials.fieldRoleEn")],
    ["displayOrder", t("testimonials.fieldOrder")],
  ] as const;

  useEffect(() => {
    void fetchTestimonials().then(setItems).catch((e) => setLoadError(e.message));
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
      const saved = "id" in draft ? await updateTestimonial(draft.id, input) : await createTestimonial(input);
      setItems((list) => ("id" in draft ? (list ?? []).map((x) => (x.id === saved.id ? saved : x)) : [...(list ?? []), saved]));
      setNotice(t("testimonials.savedSuccess"));
      setDraft(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("testimonials.saveError"));
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(target: BackendTestimonial) {
    try {
      await deleteTestimonial(target.id);
      setItems((list) => (list ?? []).filter((x) => x.id !== target.id));
      showToast("success", t("testimonials.deleteSuccess"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("testimonials.deleteError"));
    }
  }

  const isNew = draft && !("id" in draft);
  const canSave = Boolean(draft && (isNew ? creatable : editable));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("testimonials.title")}
        description={t("testimonials.description")}
        actions={creatable ? <Button onClick={() => { setError(""); setDraft(blank()); }}>{t("testimonials.addTestimonial")}</Button> : undefined}
      />
      {notice && <p className="rounded-lg bg-success/10 p-3 text-sm text-success">{notice}</p>}
      {error && !draft && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {items === null && loadError && <EmptyState icon="alert" title={t("testimonials.loadError")} description={loadError} />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {items === null
          ? (loadError ? [] : Array.from({ length: 3 })).map((_, i) => (
              <Card key={i} className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))
          : items.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-center gap-3">
              {item.imageSrc ? (
                <img src={item.imageSrc} alt={item.nameAr} className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-bold">
                  {item.nameAr.slice(0, 2)}
                </div>
              )}
              <div>
                <h2 className="font-bold">{item.nameAr}</h2>
                <p className="text-xs text-muted">{item.roleAr}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{item.quoteAr}</p>
            <p className="mt-2 text-xs">
              {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)} · {item.active ? t("testimonials.active") : t("testimonials.inactive")} · {t("testimonials.orderLabel", { order: item.displayOrder })}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setError(""); setDraft(item); }}>{editable ? t("testimonials.edit") : t("testimonials.view")}</Button>
              {deletable && (
                <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDeleteTarget(item)}>
                  {t("testimonials.delete")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={close}
        title={isNew ? t("testimonials.addTitle") : t("testimonials.editTitle", { name: draft && "id" in draft ? draft.nameAr : "" })}
        description={t("testimonials.editDescription")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>{t("testimonials.cancel")}</Button>
            <Button onClick={save} disabled={!canSave || saving}>{saving ? t("testimonials.saving") : t("testimonials.saveChanges")}</Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

            <div className="flex items-center gap-4">
              {draft.imageSrc ? (
                <img src={draft.imageSrc} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-hover text-xs text-muted">{t("testimonials.noImage")}</div>
              )}
              <label className="text-sm font-medium text-foreground">
                {t("testimonials.customerImage")}
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canSave || saving}
                  className="mt-1.5 block w-full text-sm text-muted file:me-3 file:rounded-lg file:border-0 file:bg-surface-hover file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-border-soft"
                  onChange={(e) => {
                    handleImageFile(e.target.files?.[0], (src) => setDraft(draft && { ...draft, imageSrc: src }));
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

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
              <label className="text-sm font-medium text-foreground">
                {t("testimonials.ratingLabel")}
                <input
                  type="number"
                  min={1}
                  max={5}
                  disabled={!canSave || saving}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                  value={draft.rating}
                  onChange={(e) => setDraft({ ...draft, rating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-foreground">
              {t("testimonials.quoteLabel")}
              <textarea
                disabled={!canSave || saving}
                className="mt-1.5 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={draft.quoteAr}
                onChange={(e) => setDraft({ ...draft, quoteAr: e.target.value })}
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              {t("testimonials.quoteEnLabel")}
              <textarea
                disabled={!canSave || saving}
                className="mt-1.5 min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={draft.quoteEn ?? ""}
                onChange={(e) => setDraft({ ...draft, quoteEn: e.target.value || null })}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border-soft bg-background-soft px-4 py-3 text-sm">
              <span>{t("testimonials.activeOnSite")}</span>
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
          title={t("testimonials.deleteConfirmTitle")}
          description={t("testimonials.deleteConfirmDesc")}
          confirmLabel={t("testimonials.delete")}
          variant="danger"
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
