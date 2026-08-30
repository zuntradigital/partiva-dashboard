"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, SearchInput, Select, Field, Button, EmptyState, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaDetailModal, type MediaItem } from "@/components/media/MediaDetailModal";
import { UploadModal } from "@/components/media/UploadModal";
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

// The Website's origin -- legacy media rows store a Website-relative path
// (e.g. "/images/logo.png", served from the Website's own public folder), so
// it must be resolved against the Website, not this Dashboard's own origin,
// or the <img> 404s. New uploads are self-contained base64 data URLs and
// already work from any origin. Same env var the Sidebar logo uses.
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3002";
function resolveMediaUrl(url: string): string {
  return url.startsWith("/") ? `${WEBSITE_URL}${url}` : url;
}

// Section labels for the site's known usage locations -- unrecognized keys
// (e.g. a future section) fall back to the raw key instead of disappearing.
const SECTION_LABEL_KEYS: Record<string, string> = {
  hero: "media.sectionHero",
  cta: "media.sectionCta",
  navbar: "media.sectionNavbar",
  footer: "media.sectionFooter",
  "article-cover-watermark": "media.sectionArticleWatermark",
  main: "media.sectionMain",
};

function toMediaItem(m: BackendMedia, t: (key: string, vars?: Record<string, string | number>) => string): MediaItem {
  return {
    id: String(m.id),
    filename: m.filename,
    mimeType: m.mimeType,
    sizeKB: m.sizeKb,
    width: m.width ?? 0,
    height: m.height ?? 0,
    altText: { ar: m.altAr, en: m.altEn },
    uploaderName: m.uploadedBy ?? "—",
    uploadedAt: m.createdAt,
    usedIn: m.usedIn.map((u) => ({
      type: u.route ? "page" : "global",
      id: u.route ?? "global",
      usageId: u.id,
      label: `${u.route ? (u.routeTitleAr ?? u.route) : t("media.globalUsage")} — ${SECTION_LABEL_KEYS[u.section] ? t(SECTION_LABEL_KEYS[u.section]!) : u.section}`,
    })),
    accentColor: "linear-gradient(135deg,#4f6df5,#8b5cf6)",
    objectUrl: resolveMediaUrl(m.url),
  };
}

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
              <MediaCard key={asset.id} asset={asset} onClick={() => setSelectedId(asset.id)} />
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
          onDelete={(id) => {
            setActionError(null);
            void deleteMedia(Number(id))
              .then(() => {
                setMedia((prev) => (prev ?? []).filter((m) => String(m.id) !== id));
                setSelectedId(null);
              })
              .catch((e) => setActionError(e instanceof ApiError ? e.message : t("media.deleteAssetError")));
          }}
        />
      )}

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
