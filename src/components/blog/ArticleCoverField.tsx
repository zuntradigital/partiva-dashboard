"use client";

import { useRef, useState } from "react";
import { Button, Field, Input, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { resolveMediaUrl } from "@/lib/media";
import { uploadMediaFile, ApiError, type BackendMedia } from "@/lib/api";
import { MediaPickerModal } from "@/components/blog/MediaPickerModal";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_KB = 5 * 1024;

export interface CoverValue {
  src: string;
  alt: string;
  width: number;
  height: number;
  mediaId: number | null;
}

/**
 * Article Create/Edit's cover-image field. A CMS-grade replacement for a
 * plain <input type="file">: drag & drop or click to upload a real file
 * immediately (stored through the Media Library's upload endpoint, never
 * base64), or open the picker to reuse an already-uploaded asset -- either
 * path ends by calling onChange with a real BackendMedia-backed value, so
 * the article always references a real, reusable Library asset going
 * forward (a pre-existing legacy cover with no mediaId keeps rendering
 * fine; only replacing it moves it onto the Library).
 */
export function ArticleCoverField({
  value,
  disabled,
  onChange,
}: {
  value: CoverValue;
  disabled?: boolean;
  onChange: (value: CoverValue) => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function fromMedia(media: BackendMedia): CoverValue {
    return {
      src: media.url,
      alt: media.altAr || media.altEn || value.alt,
      width: media.width ?? 0,
      height: media.height ?? 0,
      mediaId: media.id,
    };
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t("coverField.disallowedType", { type: file.type || t("coverField.unknownType") });
    }
    if (file.size / 1024 > MAX_SIZE_KB) {
      return t("coverField.sizeExceeded", { size: (file.size / 1024 / 1024).toFixed(1) });
    }
    return null;
  }

  function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    uploadMediaFile(file, {}, setProgress)
      .then((created) => {
        setUploading(false);
        onChange(fromMedia(created));
      })
      .catch((e) => {
        setUploading(false);
        setError(e instanceof ApiError ? e.message : t("coverField.uploadError"));
      });
  }

  const isEmpty = !value.src && !uploading;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.currentTarget.value = "";
        }}
      />

      {isEmpty && (
        <div
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            if (disabled) return;
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-muted">
            <Icon name="image" className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50">
              {t("coverField.clickToUpload")}
            </button>
            <span className="text-xs text-muted-soft">{t("coverField.orDrag")}</span>
          </div>
          <p className="text-[11px] text-muted-soft">{t("coverField.constraints")}</p>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setPickerOpen(true)}>
            <Icon name="media" className="h-4 w-4" /> {t("coverField.chooseFromLibrary")}
          </Button>
        </div>
      )}

      {uploading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-primary/5 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-primary">
            <Icon name="upload" className="h-5 w-5 animate-pulse" />
          </div>
          <p className="text-sm text-foreground">{t("coverField.uploading", { percent: progress })}</p>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-hover">
            <div className="h-full rounded-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {!isEmpty && !uploading && value.src && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-border-soft bg-background-soft">
            <img src={resolveMediaUrl(value.src)} alt={value.alt || t("coverField.previewAlt")} className="max-h-64 w-full object-cover" />
            <span className="absolute end-2 top-2">
              <Badge variant={value.mediaId ? "success" : "info"}>
                {value.mediaId ? t("coverField.fromLibraryBadge") : t("coverField.customBadge")}
              </Badge>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
              <Icon name="upload" className="h-4 w-4" /> {t("coverField.replace")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setPickerOpen(true)}>
              <Icon name="media" className="h-4 w-4" /> {t("coverField.chooseFromLibrary")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="text-danger hover:bg-danger/10"
              onClick={() => onChange({ src: "", alt: "", width: 0, height: 0, mediaId: null })}
            >
              <Icon name="trash" className="h-4 w-4" /> {t("coverField.remove")}
            </Button>
            {value.width > 0 && value.height > 0 && (
              <span className="text-xs text-muted-soft">
                {value.width}×{value.height}
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 text-xs text-danger">
          <Icon name="alert" className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <Field label={t("editor.altLabel")} htmlFor="article-cover-alt" className="mt-4">
        <Input
          id="article-cover-alt"
          disabled={disabled}
          value={value.alt}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
        />
      </Field>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(media) => {
          setError(null);
          onChange(fromMedia(media));
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
