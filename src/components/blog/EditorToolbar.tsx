"use client";

import { Select } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export type ToolbarStyleValue = "paragraph" | "1" | "2" | "3" | "4" | "5" | "6";

interface EditorToolbarProps {
  disabled: boolean;
  styleValue: ToolbarStyleValue;
  onStyleChange: (value: ToolbarStyleValue) => void;
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onImage: () => void;
  onBulletList: () => void;
  onNumberedList: () => void;
  onTable: () => void;
  imageDisabled?: boolean;
}

function ToolbarButton({
  onPress,
  disabled,
  title,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      // mousedown (not click) + preventDefault keeps focus/selection on the
      // rich-text field that was being edited, so execCommand has something to act on.
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}

/** A single toolbar above the article content editor -- operates on whichever
 * paragraph/heading RichTextField most recently had focus (tracked by the parent). */
export function EditorToolbar({
  disabled,
  styleValue,
  onStyleChange,
  onBold,
  onItalic,
  onLink,
  onImage,
  onBulletList,
  onNumberedList,
  onTable,
  imageDisabled,
}: EditorToolbarProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-2">
      <Select
        value={styleValue}
        disabled={disabled}
        onChange={(e) => onStyleChange(e.target.value as ToolbarStyleValue)}
        className="h-9 w-auto min-w-[8rem] py-0 text-xs"
      >
        <option value="paragraph">{t("toolbar.normalText")}</option>
        {(["1", "2", "3", "4", "5", "6"] as const).map((level) => (
          <option key={level} value={level}>
            {t("toolbar.headingLevel", { level })}
          </option>
        ))}
      </Select>

      <div className="mx-1 h-6 w-px bg-border-soft" />

      <ToolbarButton onPress={onBold} disabled={disabled} title={t("toolbar.bold")}>
        <span className="font-serif">B</span>
      </ToolbarButton>
      <ToolbarButton onPress={onItalic} disabled={disabled} title={t("toolbar.italic")}>
        <span className="font-serif italic">I</span>
      </ToolbarButton>
      <ToolbarButton onPress={onLink} disabled={disabled} title={t("toolbar.addLink")}>
        <Icon name="link" className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onPress={onImage} disabled={disabled || imageDisabled} title={t("toolbar.insertImage")}>
        <Icon name="image" className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onPress={onBulletList} disabled={disabled} title={t("toolbar.bulletList")}>
        <span>•≡</span>
      </ToolbarButton>
      <ToolbarButton onPress={onNumberedList} disabled={disabled} title={t("toolbar.numberedList")}>
        <span className="text-xs">1≡</span>
      </ToolbarButton>
      <ToolbarButton onPress={onTable} disabled={disabled} title={t("toolbar.insertTable")}>
        <span>▦</span>
      </ToolbarButton>
    </div>
  );
}
