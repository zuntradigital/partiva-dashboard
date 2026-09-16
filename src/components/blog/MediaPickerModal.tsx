"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, SearchInput, EmptyState, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { toMediaItem } from "@/lib/media";
import { fetchMedia, uploadMediaFile, ApiError, type BackendMedia } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_KB = 5 * 1024;

type Tab = "library" | "upload";

/**
 * Article cover image source, offered as one modal with two ways in --
 * "Choose from Media Library" (reuse an asset already uploaded, for any
 * article) and "Upload New Image" (a real file, stored once and from then
 * on itself reusable the same way). Both paths end the same way: onSelect
 * is called with the resulting BackendMedia row, which is all
 * ArticleCoverField needs to set the article's cover.
 */
export function MediaPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: BackendMedia) => void;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("library");

  // ---- Library tab ----
  const [media, setMedia] = useState<BackendMedia[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    // Deliberately no synchronous setMedia(null)/setLoadError(null) reset
    // here -- only the .then/.catch below ever call setState, so reopening
    // the modal just quietly refreshes in the background (no empty-state
    // flicker) and a stale error clears itself the moment the refetch
    // succeeds.
    void fetchMedia()
      .then(setMedia)
      .catch(() => setLoadError(t("mediaPicker.loadError")));
  }, [open, t]);

  const assets = useMemo(() => (media ?? []).map((m) => toMediaItem(m, t)), [media, t]);
  const filtered = useMemo(
    () => assets.filter((a) => a.filename.toLowerCase().includes(query.toLowerCase())),
    [assets, query],
  );

  // ---- Upload tab ----
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t("mediaPicker.disallowedType", { type: file.type || t("mediaPicker.unknownType") });
    }
    if (file.size / 1024 > MAX_SIZE_KB) {
      return t("mediaPicker.sizeExceeded", { size: (file.size / 1024 / 1024).toFixed(1) });
    }
    return null;
  }

  function handleFile(file: File) {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError(null);
    setUploading(true);
    setProgress(0);
    uploadMediaFile(file, {}, setProgress)
      .then((created) => {
        setUploading(false);
        onSelect(created);
      })
      .catch((e) => {
        setUploading(false);
        setUploadError(e instanceof ApiError ? e.message : t("mediaPicker.uploadError"));
      });
  }

  function reset() {
    setTab("library");
    setQuery("");
    setUploadError(null);
    setUploading(false);
    setProgress(0);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("mediaPicker.title")}
      description={t("mediaPicker.description")}
      size="lg"
    >
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        <button
          onClick={() => setTab("library")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "library" ? "bg-gradient-brand text-white" : "text-muted hover:text-foreground"
          }`}
        >
          <Icon name="media" className="h-3.5 w-3.5" /> {t("mediaPicker.tabLibrary")}
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "upload" ? "bg-gradient-brand text-white" : "text-muted hover:text-foreground"
          }`}
        >
          <Icon name="upload" className="h-3.5 w-3.5" /> {t("mediaPicker.tabUpload")}
        </button>
      </div>

      {tab === "library" && (
        <div>
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mediaPicker.searchPlaceholder")}
            className="mb-4"
          />
          {media === null ? (
            loadError ? (
              <EmptyState icon="alert" title={t("mediaPicker.loadError")} description={loadError} />
            ) : (
              <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <EmptyState icon="media" title={t("mediaPicker.emptyTitle")} description={t("mediaPicker.emptyDesc")} />
          ) : (
            <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((asset) => {
                const original = media!.find((m) => String(m.id) === asset.id)!;
                return <MediaCardMini key={asset.id} objectUrl={asset.objectUrl} filename={asset.filename} usedCount={asset.usedIn.length} onClick={() => onSelect(original)} />;
              })}
            </div>
          )}
        </div>
      )}

      {tab === "upload" && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.currentTarget.value = "";
            }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-12 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {uploading ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-primary">
                  <Icon name="upload" className="h-5 w-5 animate-pulse" />
                </div>
                <p className="text-sm text-foreground">{t("mediaPicker.uploading", { percent: progress })}</p>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-hover">
                  <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-muted">
                  <Icon name="upload" className="h-5 w-5" />
                </div>
                <button onClick={() => inputRef.current?.click()} className="text-sm font-medium text-primary hover:underline">
                  {t("mediaPicker.clickToChoose")}
                </button>
                <p className="text-xs text-muted-soft">{t("mediaPicker.orDrag")}</p>
                <p className="text-[11px] text-muted-soft">{t("mediaPicker.constraints")}</p>
              </>
            )}
          </div>
          {uploadError && (
            <p className="mt-3 flex items-center gap-2 text-xs text-danger">
              <Icon name="alert" className="h-4 w-4 shrink-0" /> {uploadError}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Lightweight thumbnail tile for the picker grid -- deliberately not the
 * full MediaCard (which shows the "no alt text" badge and used-count line
 * styled for the main Library page); this picker just needs a fast visual
 * pick, so a simpler hover-affordance card keeps the grid dense. */
function MediaCardMini({ objectUrl, filename, usedCount, onClick }: { objectUrl?: string; filename: string; usedCount: number; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-xl border border-border bg-surface text-start transition-colors hover:border-primary/50"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-hover">
        {objectUrl && (
          <img src={objectUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-foreground">{t("mediaPicker.use")}</span>
        </div>
      </div>
      <div className="p-2">
        <p className="truncate text-[11px] font-medium text-foreground">{filename}</p>
        {usedCount > 0 && <p className="text-[10px] text-muted-soft">{t("media.usedInCount", { count: usedCount })}</p>}
      </div>
    </button>
  );
}
