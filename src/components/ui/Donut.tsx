"use client";

import { useLanguage } from "@/lib/i18n";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({ segments, size = 140 }: { segments: DonutSegment[]; size?: number }) {
  const { t } = useLanguage();
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const stops = segments
    .reduce<{ cursor: number; parts: string[] }>(
      (acc, s) => {
        const start = (acc.cursor / total) * 360;
        const nextCursor = acc.cursor + s.value;
        const end = (nextCursor / total) * 360;
        return { cursor: nextCursor, parts: [...acc.parts, `${s.color} ${start}deg ${end}deg`] };
      },
      { cursor: 0, parts: [] },
    )
    .parts.join(", ");

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative shrink-0 animate-donut-draw rounded-full"
        style={{ width: size, height: size, backgroundImage: `conic-gradient(${stops})` }}
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-surface text-center">
          <span className="text-lg font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted">{t("common.total")}</span>
        </div>
      </div>
      <ul className="space-y-2">
        {segments.map((s, i) => (
          <li key={s.label} className="flex animate-fade-in items-center gap-2 text-xs" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="font-semibold text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
