"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";
import { useLanguage } from "@/lib/i18n";

export interface DropdownAction {
  label: string;
  icon?: IconName;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Dropdown({ trigger, actions }: { trigger?: React.ReactNode; actions: DropdownAction[] }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
        aria-label={t("common.more")}
      >
        {trigger ?? <Icon name="more" className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute end-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface-soft py-1 shadow-2xl">
          {actions.map((action) => (
            <button
              key={action.label}
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                action.danger ? "text-danger hover:bg-danger/10" : "text-foreground hover:bg-surface-hover",
              )}
            >
              {action.icon && <Icon name={action.icon} className="h-4 w-4" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
