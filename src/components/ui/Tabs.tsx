"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  badge?: React.ReactNode;
}

export function Tabs({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            active === item.key ? "text-foreground" : "text-muted hover:text-foreground",
          )}
        >
          {item.label}
          {item.badge}
          {active === item.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-brand" />}
        </button>
      ))}
    </div>
  );
}
