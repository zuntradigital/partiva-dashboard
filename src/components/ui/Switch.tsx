"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-gradient-brand" : "bg-surface-hover",
      )}
    >
      <span
        className={cn(
          "absolute inline-block h-4.5 w-4.5 rounded-full bg-white transition-all",
          checked ? "end-1" : "start-1",
        )}
      />
    </button>
  );
}
