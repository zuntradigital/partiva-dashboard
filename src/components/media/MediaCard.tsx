"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import type { MediaItem } from "./MediaDetailModal";

export function MediaCard({ asset, onClick }: { asset: MediaItem; onClick: () => void }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-border bg-surface text-start transition-colors hover:border-primary/50"
    >
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
  );
}
