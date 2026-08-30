"use client";

import { Icon } from "@/components/icons";
import { Button } from "./Button";

export function Pagination({
  page,
  pageCount,
  onChange,
  totalLabel,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  totalLabel?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5">
      <p className="text-xs text-muted">{totalLabel}</p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <Icon name="chevron-right" className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs text-muted">
          {page} / {pageCount}
        </span>
        <Button variant="ghost" size="icon" disabled={page === pageCount} onClick={() => onChange(page + 1)}>
          <Icon name="chevron-left" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
