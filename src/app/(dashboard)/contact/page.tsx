"use client";
import { useEffect, useState } from "react";
import { Button, Card, ConfirmDialog, PageHeader, Skeleton, ToastViewport } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useToast } from "@/lib/useToast";
import { useLanguage } from "@/lib/i18n";
import { ApiError, deleteContactInfo, fetchContactInfo, type BackendContactInfo, type ContactSocialLink, updateContactInfo } from "@/lib/api";

export default function ContactPage() {
  const { can } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const { t } = useLanguage();
  const [info, setInfo] = useState<BackendContactInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const editable = can("contact_info", "edit");
  const deletable = can("contact_info", "delete");

  const fields = [
    ["whatsappNumber", t("contact.fieldWhatsappNumber")],
    ["whatsappLink", t("contact.fieldWhatsappLink")],
    ["websiteUrl", t("contact.fieldWebsiteUrl")],
    ["email", t("contact.fieldEmail")],
    ["addressAr", t("contact.fieldAddressAr")],
    ["addressEn", t("contact.fieldAddressEn")],
    ["locationAr", t("contact.fieldLocationAr")],
    ["locationEn", t("contact.fieldLocationEn")],
  ] as const;

  useEffect(() => {
    void fetchContactInfo().then(setInfo).catch((e) => setError(e.message));
  }, []);

  async function save() {
    if (!info) return;
    setSaving(true);
    setError("");
    try {
      const saved = await updateContactInfo({ ...info, social: info.social.filter((s) => s.platform.trim() || s.url.trim()) });
      setInfo(saved);
      setNotice(t("contact.savedSuccess"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("contact.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    try {
      const cleared = await deleteContactInfo();
      setInfo(cleared);
      showToast("success", t("contact.clearedSuccess"));
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("contact.clearError"));
    }
  }

  function updateSocial(index: number, patch: Partial<ContactSocialLink>) {
    setInfo((i) => i && { ...i, social: i.social.map((s, idx) => (idx === index ? { ...s, ...patch } : s)) });
  }

  if (!info) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("contact.title")} description={t("contact.description")} />
        {error ? (
          <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
        ) : (
          <>
            <Card className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map(([key]) => (
                  <div key={key} className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="space-y-3 p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-full" />
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("contact.title")}
        description={t("contact.description")}
        actions={
          <>
            {deletable && <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={saving}>{t("contact.clearAll")}</Button>}
            {editable && <Button onClick={save} disabled={saving}>{saving ? t("contact.saving") : t("contact.saveChanges")}</Button>}
          </>
        }
      />
      {notice && <p className="rounded-lg bg-success/10 p-3 text-sm text-success">{notice}</p>}
      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <label key={key} className="text-sm font-medium text-foreground">
              {label}
              <input
                disabled={!editable || saving}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                value={info[key] ?? ""}
                onChange={(e) => setInfo({ ...info, [key]: e.target.value || null })}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t("contact.socialLinksTitle")}</h2>
          {editable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInfo({ ...info, social: [...info.social, { id: `soc-${Date.now()}`, platform: "", url: "" }] })}
            >
              <Icon name="plus" className="h-3.5 w-3.5" /> {t("contact.addLink")}
            </Button>
          )}
        </div>
        {info.social.length === 0 ? (
          <p className="text-sm text-muted">{t("contact.noLinksYet")}</p>
        ) : (
          <div className="space-y-2.5">
            {info.social.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <input
                  disabled={!editable || saving}
                  placeholder={t("contact.platformPlaceholder")}
                  className="w-40 shrink-0 rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                  value={s.platform}
                  onChange={(e) => updateSocial(i, { platform: e.target.value })}
                />
                <input
                  disabled={!editable || saving}
                  placeholder={t("contact.urlPlaceholder")}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-background-soft"
                  value={s.url}
                  onChange={(e) => updateSocial(i, { url: e.target.value })}
                />
                {editable && (
                  <button
                    type="button"
                    onClick={() => setInfo({ ...info, social: info.social.filter((_, idx) => idx !== i) })}
                    className="rounded p-2 text-danger hover:bg-danger/10"
                    aria-label={t("contact.deleteLinkAria")}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetAll}
        title={t("contact.clearConfirmTitle")}
        description={t("contact.clearConfirmDesc")}
        confirmLabel={t("contact.clearAll")}
        variant="danger"
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
