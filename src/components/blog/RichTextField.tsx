"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";
import type { InlineRun } from "@/lib/api";

// A Private-Use-Area character: never occurs in real text, so it's a safe
// marker to briefly insert at the cursor and locate afterwards.
const CURSOR_MARKER = "";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// Same allowlist used for hrefs on the Backend/Website -- rejects
// javascript:/data:/vbscript: and protocol-relative URIs, which would
// otherwise execute when this stored innerHTML is rendered/clicked.
function isSafeHref(href: string): boolean {
  if (href.startsWith("//")) return false;
  if (href.startsWith("/")) return true;
  return /^https?:\/\//i.test(href);
}

function runsToHtml(runs: InlineRun[]): string {
  return runs
    .map((run) => {
      let html = escapeHtml(run.text).replace(/\n/g, "<br/>");
      if (run.href && isSafeHref(run.href)) html = `<a href="${escapeAttr(run.href)}">${html}</a>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.bold) html = `<strong>${html}</strong>`;
      return html;
    })
    .join("");
}

function mergeRuns(runs: InlineRun[]): InlineRun[] {
  const merged: InlineRun[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && last.bold === run.bold && last.italic === run.italic && last.href === run.href) {
      last.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged.filter((r) => r.text.length > 0);
}

function domToRuns(container: HTMLElement): InlineRun[] {
  const runs: InlineRun[] = [];

  function walk(node: ChildNode, bold: boolean, italic: boolean, href: string | undefined) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.length > 0) runs.push({ text, bold: bold || undefined, italic: italic || undefined, href });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    if (el.tagName === "BR") {
      runs.push({ text: "\n" });
      return;
    }
    if (el.tagName === "IMG") return; // inline images aren't representable as a run -- handled via block-splitting

    const nextBold = bold || el.tagName === "B" || el.tagName === "STRONG";
    const nextItalic = italic || el.tagName === "I" || el.tagName === "EM";
    const nextHref = el.tagName === "A" ? (el.getAttribute("href") ?? href) : href;

    for (const child of Array.from(node.childNodes)) walk(child, nextBold, nextItalic, nextHref);
  }

  for (const child of Array.from(container.childNodes)) walk(child, false, false, undefined);
  return mergeRuns(runs);
}

function splitRunsAtMarker(runs: InlineRun[]): { before: InlineRun[]; after: InlineRun[] } {
  const before: InlineRun[] = [];
  const after: InlineRun[] = [];
  let found = false;

  for (const run of runs) {
    if (!found && run.text.includes(CURSOR_MARKER)) {
      const idx = run.text.indexOf(CURSOR_MARKER);
      const left = run.text.slice(0, idx);
      const right = run.text.slice(idx + CURSOR_MARKER.length);
      if (left) before.push({ ...run, text: left });
      if (right) after.push({ ...run, text: right });
      found = true;
    } else if (found) {
      after.push(run);
    } else {
      before.push(run);
    }
  }

  return found ? { before, after } : { before: runs, after: [] };
}

export interface RichTextFieldHandle {
  exec: (command: "bold" | "italic" | "createLink", value?: string) => void;
  /** Inserts a zero-width marker at the current cursor, reads the field back
   * out, and splits it into runs before/after that exact position -- used to
   * insert an image block at the precise cursor location. */
  splitAtCursor: () => { before: InlineRun[]; after: InlineRun[] } | null;
}

interface RichTextFieldProps {
  runs: InlineRun[];
  onChange: (runs: InlineRun[]) => void;
  onFocus?: () => void;
  readOnly?: boolean;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

export const RichTextField = forwardRef<RichTextFieldHandle, RichTextFieldProps>(function RichTextField(
  { runs, onChange, onFocus, readOnly, placeholder, multiline = true, className },
  ref
) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || document.activeElement === el) return;
    el.innerHTML = runsToHtml(runs);
  }, [runs]);

  useImperativeHandle(ref, () => ({
    exec(command, value) {
      const el = elRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(command, false, value);
      onChange(domToRuns(el));
    },
    splitAtCursor() {
      const el = elRef.current;
      if (!el) return null;
      el.focus();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !el.contains(selection.anchorNode)) return null;
      document.execCommand("insertText", false, CURSOR_MARKER);
      const result = splitRunsAtMarker(domToRuns(el));
      el.innerHTML = runsToHtml(runs); // restore -- the caller replaces this block entirely
      return result;
    },
  }));

  return (
    <div
      ref={elRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={onFocus}
      onInput={() => elRef.current && onChange(domToRuns(elRef.current))}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") e.preventDefault();
      }}
      data-placeholder={placeholder}
      className={cn(
        "w-full rounded-xl border border-border bg-background-soft px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary",
        "empty:before:text-muted-soft empty:before:content-[attr(data-placeholder)]",
        readOnly && "cursor-not-allowed opacity-50",
        multiline ? "min-h-24" : "min-h-0",
        className
      )}
    />
  );
});
