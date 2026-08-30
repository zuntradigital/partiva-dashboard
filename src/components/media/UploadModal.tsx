"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Button, Field, Input, Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { fetchPages, fetchPage, type BackendPage, type BackendPageSection } from "@/lib/api";

/** Upload — SRS Section 13. Allow-listed MIME types (WEB-ADM-FR-059), size cap (WEB-ADM-FR-060,
 * Engineering Recommendation 5MB), and mandatory alt text before an asset can be used (WEB-ADM-FR-055).
 * Page + Section are also mandatory -- every upload must declare where it's used so the backend can
 * create the matching media_usage row immediately. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];
const MAX_SIZE_KB = 5 * 1024;

// page_sections lists every section a page has, but only some of them
// actually render a Website-managed image (most are text-only) -- an
// assignment to any other section is saved but can never appear anywhere on
// the Website. This mirrors exactly the route/section pairs the Website
// resolves via resolveMedia() (see partiva-website/src/app/page.tsx and
// layout.tsx): only home's "hero" and "cta" today.
const IMAGE_CAPABLE_SECTIONS: Record<string, string[]> = {
  home: ["hero", "cta"],
};

type Step = "select" | "alt-text";

export function UploadModal({
  open,
  onClose,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, altAr: string, altEn: string, route: string, section: string) => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ file: File; objectUrl: string; width: number; height: number } | null>(null);
  const [altAr, setAltAr] = useState("");
  const [altEn, setAltEn] = useState("");
  const [pages, setPages] = useState<BackendPage[]>([]);
  const [sections, setSections] = useState<BackendPageSection[]>([]);
  const [pageSlug, setPageSlug] = useState("");
  const [sectionKey, setSectionKey] = useState("");

  useEffect(() => {
    if (open) void fetchPages().then((p) => setPages(p.filter((page) => IMAGE_CAPABLE_SECTIONS[page.slug]?.length))).catch(() => {});
  }, [open]);

  // Sections depend on the selected Page -- reload whenever it changes, and
  // clear any previously selected section since it belonged to a different page.
  useEffect(() => {
    setSectionKey("");
    if (!pageSlug) {
      setSections([]);
      return;
    }
    const allowed = IMAGE_CAPABLE_SECTIONS[pageSlug] ?? [];
    void fetchPage(pageSlug)
      .then((p) => setSections(p.sections.filter((s) => allowed.includes(s.key))))
      .catch(() => setSections([]));
  }, [pageSlug]);

  function reset() {
    setStep("select");
    setError(null);
    setPending(null);
    setAltAr("");
    setAltEn("");
    setPageSlug("");
    setSectionKey("");
  }

  function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t("uploadModal.disallowedType", { type: file.type || t("uploadModal.unknownType") }));
      return;
    }
    if (file.size / 1024 > MAX_SIZE_KB) {
      setError(t("uploadModal.sizeExceeded", { size: (file.size / 1024 / 1024).toFixed(1) }));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPending({ file, objectUrl, width: img.width, height: img.height });
      setStep("alt-text");
    };
    img.onerror = () => {
      setPending({ file, objectUrl, width: 0, height: 0 });
      setStep("alt-text");
    };
    img.src = objectUrl;
  }

  const missingPlacement = !pageSlug || !sectionKey;

  function handleConfirm() {
    if (!pending) return;
    if (missingPlacement) {
      setError(t("uploadModal.missingPlacement"));
      return;
    }
    onUpload(pending.file, altAr, altEn, pageSlug, sectionKey);
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t("uploadModal.title")}
      description={step === "select" ? t("uploadModal.descriptionSelect") : t("uploadModal.descriptionAltText")}
      footer={
        step === "alt-text" ? (
          <>
            <Button variant="ghost" onClick={() => setStep("select")}>
              {t("uploadModal.back")}
            </Button>
            <Button variant="primary" disabled={!altAr.trim() || missingPlacement} onClick={handleConfirm}>
              {t("uploadModal.saveToLibrary")}
            </Button>
          </>
        ) : undefined
      }
    >
      {step === "select" && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border py-12 text-center transition-colors hover:border-primary/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-muted">
              <Icon name="upload" className="h-5 w-5" />
            </div>
            <p className="text-sm text-foreground">{t("uploadModal.clickToChoose")}</p>
            <p className="text-xs text-muted-soft">{t("uploadModal.orDrag")}</p>
          </button>
          {error && (
            <p className="mt-3 flex items-center gap-2 text-xs text-danger">
              <Icon name="alert" className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      )}

      {step === "alt-text" && pending && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img src={pending.objectUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-foreground">{pending.file.name}</p>
              <p className="text-xs text-muted-soft">
                {pending.width}×{pending.height} · {(pending.file.size / 1024).toFixed(0)}KB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("uploadModal.pageLabel")} required>
              <Select value={pageSlug} onChange={(e) => setPageSlug(e.target.value)}>
                <option value="">{t("uploadModal.pickPage")}</option>
                {pages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.titleAr}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("uploadModal.sectionLabel")} required>
              <Select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} disabled={!pageSlug}>
                <option value="">{pageSlug ? t("uploadModal.pickSection") : t("uploadModal.pickPageFirst")}</option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.titleAr ?? s.key}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t("uploadModal.altArLabel")} required hint={t("uploadModal.altArHint")}>
            <Input value={altAr} onChange={(e) => setAltAr(e.target.value)} autoFocus />
          </Field>
          <Field label={t("uploadModal.altEnLabel")}>
            <Input value={altEn} onChange={(e) => setAltEn(e.target.value)} />
          </Field>

          {error && (
            <p className="flex items-center gap-2 text-xs text-danger">
              <Icon name="alert" className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
