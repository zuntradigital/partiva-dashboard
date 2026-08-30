"use client";

import { useEffect, useRef, useState } from "react";
import type { ArticleBlock, InlineRun } from "@/lib/api";
import { PromptDialog } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import { EditorToolbar, type ToolbarStyleValue } from "./EditorToolbar";

function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
// Same allowlist used for hrefs/image sources on the Backend/Website --
// rejects javascript:/data:/vbscript: and protocol-relative URIs, which
// would otherwise execute when this stored innerHTML is rendered/clicked.
function isSafeHref(href: string) {
  if (href.startsWith("//")) return false;
  if (href.startsWith("/")) return true;
  return /^https?:\/\//i.test(href);
}
const SAFE_DATA_IMAGE_RE = /^data:image\/(png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/]+=*$/;
function isSafeImageSrc(src: string) {
  return isSafeHref(src) || SAFE_DATA_IMAGE_RE.test(src);
}
function runsToHtml(runs: InlineRun[]) {
  return runs.map((run) => {
    let html = escapeHtml(run.text).replace(/\n/g, "<br>");
    if (run.href && isSafeHref(run.href)) html = `<a href="${run.href.replace(/"/g, "&quot;")}">${html}</a>`;
    if (run.italic) html = `<em>${html}</em>`;
    if (run.bold) html = `<strong>${html}</strong>`;
    return html;
  }).join("");
}
function blocksToHtml(blocks: ArticleBlock[]) {
  return blocks.map((block) => {
    if (block.type === "heading") { const level = block.level ?? 2; return `<h${level}>${runsToHtml(block.runs ?? [{ text: block.text }])}</h${level}>`; }
    if (block.type === "paragraph") return `<p>${runsToHtml(block.runs ?? [{ text: block.text }])}</p>`;
    if (block.type === "list") return `<${block.ordered ? "ol" : "ul"}>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${block.ordered ? "ol" : "ul"}>`;
    if (block.type === "table") return `<table><thead><tr>${block.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    if (block.type === "image") return isSafeImageSrc(block.src) ? `<img src="${block.src.replace(/"/g, "&quot;")}" alt="${block.alt.replace(/"/g, "&quot;")}">` : "";
    if (block.type === "flow") return `<ol data-block-type="flow">${block.steps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
    return `<section data-block-type="faq">${block.items.map((item) => `<h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p>`).join("")}</section>`;
  }).join("");
}
function nodeToRuns(node: ChildNode, bold = false, italic = false, href?: string): InlineRun[] {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ? [{ text: node.textContent, bold: bold || undefined, italic: italic || undefined, href }] : [];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  if (el.tagName === "BR") return [{ text: "\n" }];
  return Array.from(el.childNodes).flatMap((child) => nodeToRuns(child, bold || el.tagName === "B" || el.tagName === "STRONG", italic || el.tagName === "I" || el.tagName === "EM", el.tagName === "A" ? el.getAttribute("href") ?? href : href));
}
function mergedRuns(runs: InlineRun[]) {
  return runs.reduce<InlineRun[]>((result, run) => { const last = result.at(-1); if (last && last.bold === run.bold && last.italic === run.italic && last.href === run.href) last.text += run.text; else if (run.text) result.push(run); return result; }, []);
}
function appendInlineContent(nodes: ChildNode[], result: ArticleBlock[]) {
  const container = document.createElement("div");
  nodes.forEach((node) => container.appendChild(node.cloneNode(true)));
  const images = Array.from(container.querySelectorAll("img")).map((image) => ({ src: image.src, alt: image.alt }));
  images.forEach((_, index) => container.querySelector("img")?.replaceWith(document.createTextNode(`\uE001${index}\uE002`)));
  let pending: InlineRun[] = [];
  const flush = () => {
    const runs = mergedRuns(pending);
    const text = runs.map((run) => run.text).join("");
    if (text.trim()) result.push({ type: "paragraph", text, runs });
    pending = [];
  };
  for (const run of mergedRuns(nodeToRuns(container))) {
    const parts = run.text.split(/\uE001(\d+)\uE002/g);
    for (let index = 0; index < parts.length; index += 1) {
      if (index % 2 === 0) {
        // A line break (<br>, encoded by nodeToRuns as "\n") starts a new
        // paragraph block rather than staying inline -- the published page
        // renders each block as its own <p>, which is the only line break
        // it can display; leaving "\n" inside one run's text would instead
        // collapse onto a single line.
        const lines = parts[index].split("\n");
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) flush();
          if (line) pending.push({ ...run, text: line });
        });
      } else {
        flush();
        const image = images[Number(parts[index])];
        if (image) result.push({ type: "image", ...image });
      }
    }
  }
  flush();
}
function blocksFromEditor(editor: HTMLElement): ArticleBlock[] {
  const result: ArticleBlock[] = [];
  // Chrome leaves the first line of a freshly-emptied contentEditable
  // unwrapped (no <p>/<div>) until the user presses Enter -- so applying
  // bold/italic/a link to any part of it (via execCommand) produces a bare
  // inline element (e.g. <a href>) as a *direct* child of the editor, not
  // inside a block tag. None of the branches below match a bare inline
  // element, so it has to be collected here and flushed through the same
  // appendInlineContent() a real <p>/<div> uses -- otherwise that formatted
  // text (and its href/bold/italic) is silently dropped on save.
  let looseInline: ChildNode[] = [];
  const flushLoose = () => {
    if (looseInline.length) { appendInlineContent(looseInline, result); looseInline = []; }
  };
  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) { looseInline.push(node); continue; }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement, tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) { flushLoose(); const runs = mergedRuns(nodeToRuns(el)); const text = runs.map((run) => run.text).join(""); if (text.trim()) result.push({ type: "heading", level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6, text, runs }); }
    else if (tag === "P" || tag === "DIV") { flushLoose(); appendInlineContent(Array.from(el.childNodes), result); }
    else if (tag === "UL" || tag === "OL") {
      flushLoose();
      const items = Array.from(el.querySelectorAll(":scope > li")).map((li) => li.textContent ?? "");
      result.push(el.dataset.blockType === "flow" ? { type: "flow", steps: items } : { type: "list", ordered: tag === "OL", items });
    }
    else if (tag === "TABLE") {
  flushLoose();
  const table = el as HTMLTableElement;
  const rows = Array.from(table.rows);
  const header = rows.shift();

  result.push({
    type: "table",
    headers: header
      ? Array.from(header.cells).map((cell) => cell.textContent ?? "")
      : [],
    rows: rows.map((row) =>
      Array.from(row.cells).map((cell) => cell.textContent ?? "")
    ),
  });
}
    else if (tag === "IMG") { flushLoose(); result.push({ type: "image", src: el.getAttribute("src") ?? "", alt: el.getAttribute("alt") ?? "" }); }
    else if (tag === "SECTION" && el.dataset.blockType === "faq") {
      flushLoose();
      const entries = Array.from(el.children);
      result.push({ type: "faq", items: entries.filter((child) => child.tagName === "H3").map((heading) => ({ q: heading.textContent ?? "", a: heading.nextElementSibling?.tagName === "P" ? heading.nextElementSibling.textContent ?? "" : "" })) });
    }
    else looseInline.push(el);
  }
  flushLoose();
  return result;
}

export function ArticleContentEditor({ blocks, onChange, readOnly }: { blocks: ArticleBlock[]; onChange: (blocks: ArticleBlock[]) => void; readOnly?: boolean }) {
  const { lang, t } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  // Set right before an action blurs the editor to show a dialog (link URL,
  // image alt text) or the native file picker. Without this, that blur's
  // sync() would feed a fresh `blocks` array back in as a prop, and the
  // effect below would rewrite editorRef's innerHTML from it -- replacing
  // the very DOM nodes selectionRef's Range points to, right before command()
  // tries to restore that Range and apply the pending link/image.
  const skipNextSyncRef = useRef(false);
  const [active, setActive] = useState(false);
  const [styleValue, setStyleValue] = useState<ToolbarStyleValue>("paragraph");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [altDialogOpen, setAltDialogOpen] = useState(false);
  useEffect(() => { const editor = editorRef.current; if (editor && document.activeElement !== editor) editor.innerHTML = blocksToHtml(blocks); }, [blocks]);
  const sync = () => editorRef.current && onChange(blocksFromEditor(editorRef.current));
  const rememberSelection = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (selection?.rangeCount && editor?.contains(selection.getRangeAt(0).commonAncestorContainer)) selectionRef.current = selection.getRangeAt(0).cloneRange();
  };
  const command = (name: string, value?: string) => {
    const editor = editorRef.current;
    editor?.focus();
    if (selectionRef.current) { const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(selectionRef.current); }
    document.execCommand(name, false, value);
    rememberSelection();
    sync();
  };
  // Restores the saved selection (falling back to the end of the content if
  // it's no longer attached to the editor, e.g. the editor was never
  // focused) and returns it as a live Range for direct DOM insertion --
  // used instead of execCommand("createLink"/"insertHTML") below, since
  // execCommand's own "where do I put this" behavior when the restored
  // selection isn't exactly what it expects is implementation-defined, and
  // in practice can insert at the start of the content instead of at the
  // cursor.
  const restoreEditorRange = (): Range | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    // Read the saved selection BEFORE focusing the editor -- focus() fires
    // the editor's own onFocus synchronously, which calls rememberSelection()
    // and could otherwise overwrite selectionRef.current with whatever the
    // browser reports at that instant, right before the next line reads it.
    const saved = selectionRef.current;
    editor.focus();
    const range = document.createRange();
    if (saved && editor.contains(saved.commonAncestorContainer)) {
      range.setStart(saved.startContainer, saved.startOffset);
      range.setEnd(saved.endContainer, saved.endOffset);
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range;
  };
  const changeStyle = (value: ToolbarStyleValue) => { setStyleValue(value); command("formatBlock", value === "paragraph" ? "P" : `H${value}`); };
  const insertLink = () => { rememberSelection(); skipNextSyncRef.current = true; setLinkDialogOpen(true); };
  const insertImage = () => { rememberSelection(); skipNextSyncRef.current = true; imageInputRef.current?.click(); };
  // The selected text becomes the link's visible label (wrapping it in
  // place via the Range) instead of execCommand inserting the raw URL as
  // new text next to it.
  const applyLink = (url: string) => {
    const range = restoreEditorRange();
    if (!range) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    if (range.collapsed) anchor.textContent = url;
    else anchor.appendChild(range.extractContents());
    range.insertNode(anchor);
    range.setStartAfter(anchor);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range.cloneRange();
    sync();
  };
  // Inserts at the saved cursor position via the Range directly, instead of
  // execCommand("insertHTML") which can land at the start of the content
  // when its own selection restoration doesn't take.
  const applyImage = (src: string, alt: string) => {
    const editor = editorRef.current;
    const range = restoreEditorRange();
    if (!range || !editor) return;
    range.deleteContents();
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    const spacer = document.createElement("p");
    spacer.innerHTML = "<br>";

    // Find the paragraph/heading/list the cursor sits in (its direct
    // ancestor under the editor) so the image and a fresh empty paragraph
    // can be inserted as ITS siblings, splitting it at the cursor --
    // inserting them straight into the range would nest a <p> inside it.
    let block: Node = range.startContainer;
    while (block !== editor && block.parentNode && block.parentNode !== editor) block = block.parentNode;

    let cursorRange: Range;
    if (block === editor || !(block instanceof HTMLElement)) {
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      range.insertNode(spacer);
      range.setStartAfter(spacer);
      range.collapse(true);
      cursorRange = range;
    } else {
      const tailRange = document.createRange();
      tailRange.setStart(range.startContainer, range.startOffset);
      tailRange.setEnd(block, block.childNodes.length);
      const tail = tailRange.extractContents();
      const afterBlock = document.createElement(block.tagName);
      afterBlock.appendChild(tail);
      block.after(img, spacer, afterBlock);
      if (!block.textContent?.trim() && !block.querySelector("img")) block.remove();
      if (!afterBlock.textContent?.trim() && !afterBlock.querySelector("img")) afterBlock.remove();
      cursorRange = document.createRange();
      cursorRange.setStartAfter(spacer);
      cursorRange.collapse(true);
    }

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(cursorRange);
    selectionRef.current = cursorRange.cloneRange();
    sync();
  };
  const handleImageFile = (file?: File) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(String(reader.result));
      setAltDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };
  const insertTable = () => {
    const header = t("contentEditor.tableHeaderDefault");
    command("insertHTML", `<table><thead><tr><th>${header}</th><th>${header}</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>`);
  };
  const placeholderClass =
    lang === "ar"
      ? "empty:before:content-['ابدأ_كتابة_المقال_هنا...']"
      : "empty:before:content-['Start_writing_the_article_here...']";
  return <div className="space-y-3">
    {!readOnly && <div ref={toolbarRef}><EditorToolbar disabled={!active} styleValue={styleValue} onStyleChange={changeStyle} onBold={() => command("bold")} onItalic={() => command("italic")} onLink={insertLink} onImage={insertImage} onBulletList={() => command("insertUnorderedList")} onNumberedList={() => command("insertOrderedList")} onTable={insertTable} /></div>}
    {!readOnly && <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleImageFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />}
    <div ref={editorRef} contentEditable={!readOnly} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={t("editor.contentTitle")} onFocus={() => { setActive(true); rememberSelection(); }} onBlur={(e) => {
      // Focus moving to the style dropdown (or any other toolbar control)
      // isn't really "leaving" the editor -- don't disable the toolbar out
      // from under the click that's opening it, and don't discard the
      // selection that a command is about to act on.
      if (e.relatedTarget instanceof Node && toolbarRef.current?.contains(e.relatedTarget)) return;
      setActive(false);
      if (skipNextSyncRef.current) { skipNextSyncRef.current = false; return; }
      sync();
    }} onInput={() => { rememberSelection(); sync(); }} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onSelect={rememberSelection} className={`min-h-80 w-full rounded-xl border border-border bg-background-soft px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary empty:before:text-muted-soft ${placeholderClass} [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h1]:my-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:my-3 [&_h3]:text-xl [&_h3]:font-bold [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border-soft [&_td]:p-2 [&_th]:border [&_th]:border-border-soft [&_th]:bg-surface [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6`} />
    <PromptDialog
      open={linkDialogOpen}
      onClose={() => setLinkDialogOpen(false)}
      onSubmit={(url) => { if (url) applyLink(url); }}
      title={t("contentEditor.linkDialogTitle")}
      label={t("contentEditor.linkDialogLabel")}
      placeholder="https://"
      defaultValue="https://"
      confirmLabel={t("contentEditor.linkDialogConfirm")}
    />
    <PromptDialog
      open={altDialogOpen}
      onClose={() => { setAltDialogOpen(false); setPendingImage(null); }}
      onSubmit={(alt) => {
        if (pendingImage) applyImage(pendingImage, alt);
        setPendingImage(null);
      }}
      title={t("contentEditor.altDialogTitle")}
      label={t("contentEditor.altDialogLabel")}
      confirmLabel={t("contentEditor.altDialogConfirm")}
    />
  </div>;
}
