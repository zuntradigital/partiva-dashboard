"use client";
import { useEffect, useState } from "react";
import { Button, Card, Modal, ConfirmDialog, PageHeader, Skeleton, EmptyState, ToastViewport } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import {
  ApiError,
  createPricingPlan,
  deletePricingPlan,
  fetchPricingPlans,
  transitionPricingStatus,
  updatePricingPlan,
  type BackendPricingPlan,
  type PricingWritePayload,
} from "@/lib/api";

const blank = (): PricingWritePayload => ({
  nameAr: "", nameEn: null, descriptionAr: "", descriptionEn: null, price: 0, currency: "SAR",
  billingPeriod: "شهريًا", featuresAr: [], featuresEn: null, ctaTextAr: "ابدأ الآن", ctaTextEn: null,
  ctaTarget: "/register", badgeAr: null, badgeEn: null, displayOrder: 0, active: true,
});
const write = (p: BackendPricingPlan | PricingWritePayload): PricingWritePayload => ({
  nameAr: p.nameAr, nameEn: p.nameEn, descriptionAr: p.descriptionAr, descriptionEn: p.descriptionEn, price: p.price,
  currency: p.currency, billingPeriod: p.billingPeriod, featuresAr: p.featuresAr, featuresEn: p.featuresEn,
  ctaTextAr: p.ctaTextAr, ctaTextEn: p.ctaTextEn, ctaTarget: p.ctaTarget, badgeAr: p.badgeAr, badgeEn: p.badgeEn,
  displayOrder: p.displayOrder, active: p.active,
});
type Draft = BackendPricingPlan | PricingWritePayload;

const PENDING_VARIANT: Record<string, string> = { draft: "bg-muted/15 text-muted", review: "bg-warning/15 text-warning", rejected: "bg-danger/15 text-danger" };

export default function PricingPage() {
  const { can } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<BackendPricingPlan[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackendPricingPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const fields = [
    ["nameAr", t("pricing.fieldNameAr")],
    ["nameEn", t("pricing.fieldNameEn")],
    ["descriptionAr", t("pricing.fieldDescription")],
    ["descriptionEn", t("pricing.fieldDescriptionEn")],
    ["price", t("pricing.fieldPrice")],
    ["billingPeriod", t("pricing.fieldBillingPeriod")],
    ["badgeAr", t("pricing.fieldBadge")],
    ["badgeEn", t("pricing.fieldBadgeEn")],
    ["displayOrder", t("pricing.fieldDisplayOrder")],
  ] as const;
  const PENDING_LABEL: Record<string, string> = { draft: t("pricing.pendingDraft"), review: t("pricing.pendingReview"), rejected: t("pricing.pendingRejected") };

  const editable = can("pricing", "edit");
  const creatable = can("pricing", "create");
  const deletable = can("pricing", "delete");
  const reviewer = can("pricing", "approve");

  useEffect(() => {
    void fetchPricingPlans().then(setPlans).catch((e) => setLoadError(e.message));
  }, []);

  const refreshOne = (updated: BackendPricingPlan) =>
    setPlans((items) => (items ?? []).map((p) => (p.id === updated.id ? updated : p)));

  const close = () => {
    if (!saving) {
      setDraft(null);
      setError("");
      setRejecting(false);
      setRejectComment("");
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const input = write(draft);
      const saved = "id" in draft ? await updatePricingPlan(draft.id, input) : await createPricingPlan(input);
      setPlans((items) => ("id" in draft ? (items ?? []).map((p) => (p.id === saved.id ? saved : p)) : [...(items ?? []), saved]));
      setNotice(reviewer ? t("pricing.savedChanges") : t("pricing.savedAsDraft"));
      setDraft(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("pricing.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const transition = async (action: "submit_review" | "approve" | "reject", comment?: string) => {
    if (!draft || !("id" in draft)) return;
    setSaving(true);
    setError("");
    try {
      const updated = await transitionPricingStatus(draft.id, action, comment);
      refreshOne(updated);
      setDraft(updated);
      setRejecting(false);
      setRejectComment("");
      setNotice(action === "submit_review" ? t("pricing.submittedForReview") : action === "approve" ? t("pricing.approvedAndPublished") : t("pricing.rejected"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("pricing.transitionError"));
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(target: BackendPricingPlan) {
    try {
      await deletePricingPlan(target.id);
      setPlans((x) => (x ?? []).filter((p) => p.id !== target.id));
      showToast("success", t("pricing.deleteSuccess"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("pricing.deleteError"));
    }
  }

  const isNew = draft && !("id" in draft);
  const pendingStatus = draft && "id" in draft ? draft.pendingStatus : null;
  // Sales (non-reviewer) cannot edit a plan that's already submitted for review.
  const locked = !reviewer && pendingStatus === "review";
  const canSave = Boolean(draft && (isNew ? creatable : editable) && !locked);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pricing.title")}
        description={t("pricing.description")}
        actions={creatable ? <Button onClick={() => { setError(""); setDraft(blank()); }}>{t("pricing.addPlan")}</Button> : undefined}
      />
      {notice && <p className="rounded-lg bg-success/10 p-3 text-sm text-success">{notice}</p>}
      {error && !draft && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {plans === null ? (
        loadError ? (
          <EmptyState icon="alert" title={t("pricing.loadError")} description={loadError} />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="space-y-4 p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        )
      ) : (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold">{plan.nameAr}</h2>
              {plan.pendingStatus && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${PENDING_VARIANT[plan.pendingStatus]}`}>
                  {PENDING_LABEL[plan.pendingStatus]}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{plan.descriptionAr}</p>
            <p className="mt-4 text-2xl font-bold">
              {plan.priceLabelAr || plan.price} <span className="text-sm font-normal">{plan.currency} / {plan.billingPeriod}</span>
            </p>
            {plan.pendingChanges && (
              <p className="mt-1 text-xs text-warning">
                {t("pricing.pendingChangesLabel", { price: String(plan.pendingChanges.price), currency: String(plan.pendingChanges.currency) })}
              </p>
            )}
            <p className="mt-2 text-xs">
              {plan.active ? t("pricing.active") : t("pricing.inactive")} · {t("pricing.orderLabel", { order: plan.displayOrder })}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setError(""); setDraft(plan); }}>
                {plan.pendingStatus === "review" ? t("pricing.review") : editable ? t("pricing.edit") : t("pricing.view")}
              </Button>
              {deletable && (
                <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setDeleteTarget(plan)}>
                  {t("pricing.delete")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      )}

      <Modal
        open={Boolean(draft)}
        onClose={close}
        title={isNew ? t("pricing.addPlanTitle") : t("pricing.editPlanTitle", { name: draft && "id" in draft ? draft.nameAr : "" })}
        description={t("pricing.editDescription")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>{t("pricing.cancel")}</Button>
            {!locked && (
              <Button onClick={save} disabled={!canSave || saving}>
                {saving ? t("pricing.saving") : reviewer ? t("pricing.saveChanges") : t("pricing.saveAsDraft")}
              </Button>
            )}
            {!reviewer && !isNew && pendingStatus === "draft" && (
              <Button variant="secondary" disabled={saving} onClick={() => transition("submit_review")}>{t("pricing.submitForReview")}</Button>
            )}
            {reviewer && !isNew && pendingStatus === "review" && (
              <>
                <Button variant="danger" disabled={saving} onClick={() => setRejecting(true)}>{t("pricing.reject")}</Button>
                <Button variant="primary" disabled={saving} onClick={() => transition("approve")}>{t("pricing.approveAndPublish")}</Button>
              </>
            )}
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
            {locked && <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning">{t("pricing.lockedNotice")}</p>}
            {!reviewer && pendingStatus === "rejected" && draft && "rejectionComment" in draft && draft.rejectionComment && (
              <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{t("pricing.rejectedNotice", { comment: draft.rejectionComment })}</p>
            )}
            {rejecting && (
              <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
                <label className="text-sm font-medium text-foreground">{t("pricing.rejectionReasonLabel")}</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>{t("pricing.cancel")}</Button>
                  <Button size="sm" variant="danger" disabled={!rejectComment.trim() || saving} onClick={() => transition("reject", rejectComment.trim())}>
                    {t("pricing.confirmReject")}
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-foreground">
                  {label}
                  <input
                    disabled={!canSave || saving}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                    value={String(draft[key] ?? "")}
                    onChange={(e) => setDraft({ ...draft, [key]: key === "price" || key === "displayOrder" ? Number(e.target.value) : e.target.value || null })}
                  />
                </label>
              ))}
            </div>
            <label className="block text-sm font-medium text-foreground">
              {t("pricing.featuresLabel")} <span className="font-normal text-muted">{t("pricing.featuresHint")}</span>
              <textarea
                disabled={!canSave || saving}
                className="mt-1.5 min-h-32 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={draft.featuresAr.join("\n")}
                onChange={(e) => setDraft({ ...draft, featuresAr: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t("pricing.featuresEnLabel")} <span className="font-normal text-muted">{t("pricing.featuresHint")}</span>
              <textarea
                disabled={!canSave || saving}
                className="mt-1.5 min-h-32 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={(draft.featuresEn ?? []).join("\n")}
                onChange={(e) => setDraft({ ...draft, featuresEn: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
              />
            </label>
            {reviewer && (
              <label className="flex items-center justify-between rounded-xl border border-border-soft bg-background-soft px-4 py-3 text-sm">
                <span>{t("pricing.activeOnPricingPage")}</span>
                <input type="checkbox" disabled={!canSave || saving} checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              </label>
            )}
          </div>
        )}
      </Modal>

      {deleteTarget && (
        <ConfirmDialog
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
          title={t("pricing.deleteConfirmTitle")}
          description={t("pricing.deleteConfirmDesc")}
          confirmLabel={t("pricing.delete")}
          variant="danger"
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
