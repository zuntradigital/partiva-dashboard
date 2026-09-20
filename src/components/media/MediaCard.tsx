"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";
import type { MediaItem } from "./MediaDetailModal";

export function MediaCard({ asset, onClick, onDelete }: { asset: MediaItem; onClick: () => void; onDelete?: () => void }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-primary/50">
    <button onClick={onClick} className="block w-full text-start">
      <div className="relative aspect-square w-full overflow-hidden">
        {asset.objectUrl && !failed ? (
          <img
            src={asset.objectUrl}
            alt={asset.altText.ar}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full transition-transform group-hover:scale-105" style={{ backgroundImage: asset.accentColor }} />
        )}
        {!asset.altText.ar && (
          <span className="absolute end-2 top-2">
            <Badge variant="warning">{t("media.noAltBadge")}</Badge>
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-xs font-medium text-foreground">{asset.filename}</p>
        <p className="mt-0.5 text-[11px] text-muted-soft">
          {asset.usedIn.length > 0 ? t("media.usedInCount", { count: asset.usedIn.length }) : t("media.unused")} · {asset.sizeKB}KB
        </p>
      </div>
    </button>
    {onDelete && (
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("media.deleteCardLabel", { name: asset.filename })}
        title={t("mediaModal.deleteAsset")}
        className="absolute start-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-danger shadow-sm ring-1 ring-border transition-opacity hover:bg-danger hover:text-white focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Icon name="trash" className="h-4 w-4" />
      </button>
    )}
    </div>
  );
}
