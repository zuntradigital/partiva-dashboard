"use client";

import { useRef, useState } from "react";
import { Modal, Field, Input, Select, Button, Badge, PermissionNotice, ConfirmDialog } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import type { MediaAsset, MediaUsageRef } from "@/types";

export type MediaItem = MediaAsset & { objectUrl?: string };

export function MediaDetailModal({
  asset,
  onClose,
  canEdit,
  canDelete,
  otherMedia,
  onUpdateAlt,
  onReplace,
  onRemoveUsage,
  onReplaceUsage,
  onDelete,
}: {
  asset: MediaItem;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  /** Other media items this asset's usages can be reassigned to. */
  otherMedia: { id: string; filename: string }[];
  onUpdateAlt: (id: string, altAr: string, altEn: string) => void;
  onReplace: (id: string, file: File) => void;
  onRemoveUsage: (id: string, usageId: number) => void;
  onReplaceUsage: (id: string, usageId: number, newMediaId: number) => void;
  onDelete: (id: string) => void;
}) {
  const { lang, t } = useLanguage();
  const [altAr, setAltAr] = useState(asset.altText.ar);
  const [altEn, setAltEn] = useState(asset.altText.en);
  const [imageFailed, setImageFailed] = useState(false);
  const [removingUsage, setRemovingUsage] = useState<MediaUsageRef | null>(null);
  const [replacingUsageId, setReplacingUsageId] = useState<number | null>(null);
  const [replaceTarget, setReplaceTarget] = useState("");
  const replaceRef = useRef<HTMLInputElement>(null);

  const dirty = altAr !== asset.altText.ar || altEn !== asset.altText.en;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={asset.filename}
        size="lg"
        footer={
          canEdit ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                {t("mediaModal.close")}
              </Button>
              <Button variant="secondary" disabled={!dirty} onClick={() => onUpdateAlt(asset.id, altAr, altEn)}>
                {t("mediaModal.saveAlt")}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            {asset.objectUrl && !imageFailed ? (
              <img
                src={asset.objectUrl}
                alt={asset.altText.ar}
                onError={() => setImageFailed(true)}
                className="aspect-square w-full rounded-xl object-cover"
              />
            ) : (
              <div className="aspect-square w-full rounded-xl" style={{ backgroundImage: asset.accentColor }} />
            )}
            {canEdit && (
              <>
                <input
                  ref={replaceRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onReplace(asset.id, file);
                  }}
                />
                <Button variant="outline" size="sm" className="mt-3 w-full justify-center" onClick={() => replaceRef.current?.click()}>
                  <Icon name="upload" className="h-4 w-4" /> {t("mediaModal.replaceFile")}
                </Button>
              </>
            )}
          </div>

          <div className="space-y-4">
            {!canEdit && <PermissionNotice message={t("mediaModal.noEditNotice")} />}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-soft">{t("mediaModal.typeLabel")}</p>
                <p className="text-foreground">{asset.mimeType}</p>
              </div>
              <div>
                <p className="text-muted-soft">{t("mediaModal.sizeLabel")}</p>
                <p className="text-foreground">{asset.sizeKB} KB</p>
              </div>
              <div>
                <p className="text-muted-soft">{t("mediaModal.dimensionsLabel")}</p>
                <p className="text-foreground">
                  {asset.width}×{asset.height}
                </p>
              </div>
              <div>
                <p className="text-muted-soft">{t("mediaModal.uploadedAtLabel")}</p>
                <p className="text-foreground">{formatDateTime(asset.uploadedAt, lang)}</p>
              </div>
            </div>

            <Field label={t("mediaModal.altArLabel")} required>
              <Input disabled={!canEdit} value={altAr} onChange={(e) => setAltAr(e.target.value)} />
            </Field>
            <Field label={t("mediaModal.altEnLabel")}>
              <Input disabled={!canEdit} value={altEn} onChange={(e) => setAltEn(e.target.value)} />
            </Field>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">{t("mediaModal.usageLocations", { count: asset.usedIn.length })}</p>
              {asset.usedIn.length === 0 ? (
                <p className="text-xs text-muted-soft">{t("mediaModal.notUsed")}</p>
              ) : (
                <ul className="space-y-2">
                  {asset.usedIn.map((u, i) => (
                    <li key={u.usageId ?? `${u.id}-${i}`} className="rounded-lg border border-border-soft p-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="info">{u.label}</Badge>
                        {canEdit && u.usageId !== undefined && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplacingUsageId(u.usageId!);
                                setReplaceTarget("");
                              }}
                            >
                              {t("mediaModal.replace")}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => setRemovingUsage(u)}>
                              {t("mediaModal.removeUsage")}
                            </Button>
                          </div>
                        )}
                      </div>

                      {replacingUsageId === u.usageId && (
                        <div className="mt-2 flex items-center gap-2">
                          <Select value={replaceTarget} onChange={(e) => setReplaceTarget(e.target.value)} className="text-xs">
                            <option value="">{t("mediaModal.pickReplacement")}</option>
                            {otherMedia.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.filename}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!replaceTarget}
                            onClick={() => {
                              onReplaceUsage(asset.id, u.usageId!, Number(replaceTarget));
                              setReplacingUsageId(null);
                            }}
                          >
                            {t("mediaModal.confirm")}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setReplacingUsageId(null)}>
                            {t("mediaModal.cancel")}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canDelete && (
              <div>
                <Button variant="danger" size="sm" onClick={() => onDelete(asset.id)}>
                  <Icon name="trash" className="h-4 w-4" /> {t("mediaModal.deleteAsset")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={removingUsage !== null}
        onClose={() => setRemovingUsage(null)}
        onConfirm={() => {
          if (removingUsage?.usageId !== undefined) onRemoveUsage(asset.id, removingUsage.usageId);
          setRemovingUsage(null);
        }}
        title={t("mediaModal.removeUsageConfirmTitle")}
        description={t("mediaModal.removeUsageConfirmDesc", { label: removingUsage?.label ?? "" })}
        confirmLabel={t("mediaModal.removeUsageConfirmLabel")}
        variant="danger"
      />
    </>
  );
}
