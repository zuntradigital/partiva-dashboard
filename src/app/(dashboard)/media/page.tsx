"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, SearchInput, Select, Field, Button, EmptyState, Skeleton, ConfirmDialog, ToastViewport } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/lib/useToast";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaDetailModal } from "@/components/media/MediaDetailModal";
import { UploadModal } from "@/components/media/UploadModal";
import { toMediaItem } from "@/lib/media";
import {
  fetchMedia,
  createMedia,
  updateMediaMeta,
  replaceMedia,
  deleteMedia,
  removeMediaUsage,
  reassignMediaUsage,
  ApiError,
  type BackendMedia,
} from "@/lib/api";

type UsageFilter = "all" | "used" | "unused";

export default function MediaLibraryPage() {
  const { can } = useSession();
  const { t } = useLanguage();
  const [media, setMedia] = useState<BackendMedia[] | null>(null);
  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();

  const canEdit = can("media", "edit") || can("media", "create");
  const canDelete = can("media", "delete");

  useEffect(() => {
    void fetchMedia()
      .then(setMedia)
      .catch(() => setLoadError(t("media.loadError")));
  }, [t]);

  const assets = useMemo(() => (media ?? []).map((m) => toMediaItem(m, t)), [media, t]);

  const filtered = useMemo(
    () =>
      assets
        .filter((a) => (usage === "all" ? true : usage === "used" ? a.usedIn.length > 0 : a.usedIn.length === 0))
        .filter(
          (a) =>
            a.filename.toLowerCase().includes(query.toLowerCase()) ||
            a.altText.ar.includes(query) ||
            a.altText.en.toLowerCase().includes(query.toLowerCase()),
        ),
    [assets, query, usage],
  );

  const selected = assets.find((a) => a.id === selectedId) ?? null;
  const deleteTarget = assets.find((a) => a.id === deleteTargetId) ?? null;

  // Real deletion via the API (row + references + stored file are handled
  // server-side). The list is only updated after the server confirms; on
  // failure the item stays exactly where it was and an error toast is shown.
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    setDeleting(true);
    setActionError(null);
    try {
      const result = await deleteMedia(Number(target.id));
      setMedia((prev) => (prev ?? []).filter((m) => String(m.id) !== target.id));
      if (selectedId === target.id) setSelectedId(null);
      showToast("success", result.articlesArchived > 0 ? t("media.deleteSuccessArchived", { count: result.articlesArchived }) : t("media.deleteSuccess"));
      // Re-sync so any usage shown elsewhere in the library reflects the server's state.
      void fetchMedia().then(setMedia).catch(() => {});
    } catch (e) {
      showToast("danger", e instanceof ApiError ? e.message : t("media.deleteAssetError"));
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("media.title")}
        description={t("media.description")}
        actions={
          can("media", "create") && (
            <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}>
              <Icon name="upload" className="h-4 w-4" /> {t("media.upload")}
            </Button>
          )
        }
      />

      {actionError && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{actionError}</div>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("media.searchPlaceholder")} className="sm:max-w-xs" />
          <Field label="" className="w-full sm:w-44">
            <Select value={usage} onChange={(e) => setUsage(e.target.value as UsageFilter)}>
              <option value="all">{t("media.allAssets")}</option>
              <option value="used">{t("media.used")}</option>
              <option value="unused">{t("media.unused")}</option>
            </Select>
          </Field>
          <p className="text-xs text-muted-soft sm:ms-auto">{t("media.assetCount", { count: filtered.length })}</p>
        </div>

        {media === null ? (
          loadError ? (
            <EmptyState icon="alert" title={t("media.loadError")} description={loadError} />
          ) : (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <EmptyState icon="media" title={t("media.noMatchTitle")} description={t("media.noMatchDesc")} />
        ) : (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((asset) => (
              <MediaCard key={asset.id} asset={asset} onClick={() => setSelectedId(asset.id)} onDelete={canDelete ? () => setDeleteTargetId(asset.id) : undefined} />
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <MediaDetailModal
          asset={selected}
          canEdit={canEdit}
          canDelete={canDelete}
          otherMedia={assets.filter((a) => a.id !== selected.id).map((a) => ({ id: a.id, filename: a.filename }))}
          onClose={() => {
            setSelectedId(null);
            setActionError(null);
          }}
          onRemoveUsage={(id, usageId) => {
            setActionError(null);
            void removeMediaUsage(Number(id), usageId)
              .then(() => fetchMedia().then(setMedia))
              .catch((e) => setActionError(e instanceof ApiError ? e.message : t("media.removeUsageError")));
          }}
          onReplaceUsage={(id, usageId, newMediaId) => {
            setActionError(null);
            void reassignMediaUsage(Number(id), usageId, newMediaId)
              .then(() => fetchMedia().then(setMedia))
              .catch((e) => setActionError(e instanceof ApiError ? e.message : t("media.replaceUsageError")));
          }}
          onUpdateAlt={(id, altAr, altEn) => {
            void updateMediaMeta(Number(id), { altAr, altEn }).then((updated) =>
              setMedia((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m))),
            );
          }}
          onReplace={(id, file) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result);
              const img = new Image();
              img.onload = () => {
                void replaceMedia(Number(id), { filename: file.name, dataUrl, width: img.width, height: img.height }).then((updated) =>
                  setMedia((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m))),
                );
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
          }}
          onDelete={(id) => setDeleteTargetId(id)}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => void confirmDelete()}
        title={t("mediaModal.deleteConfirmTitle")}
        description={
          deleteTarget && deleteTarget.usedIn.length > 0
            ? t("media.deleteConfirmUsedDesc", { places: deleteTarget.usedIn.map((u) => u.label).join("، ") })
            : t("mediaModal.deleteConfirmDesc")
        }
        confirmLabel={t("mediaModal.deleteConfirmLabel")}
        variant="danger"
      />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={(file, altAr, altEn, route, section) => {
          setActionError(null);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result);
            const img = new Image();
            const finish = (width: number, height: number) => {
              void createMedia({ filename: file.name, dataUrl, altAr, altEn, width, height, route, section })
                .then((created) => {
                  setMedia((prev) => [created, ...(prev ?? [])]);
                  setUploadOpen(false);
                })
                .catch((e) => setActionError(e instanceof ApiError ? e.message : t("media.uploadError")));
            };
            img.onload = () => finish(img.width, img.height);
            img.onerror = () => finish(0, 0);
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}
