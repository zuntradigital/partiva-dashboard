// Shared between the Media Library page and any picker that needs to render
// the same media rows (e.g. the Article editor's "choose from Library"
// modal) -- one mapping/URL-resolution implementation, not a copy per
// screen.
import type { BackendMedia, BackendMediaUsage } from "@/lib/api";
import type { MediaItem } from "@/components/media/MediaDetailModal";

// Legacy media rows (seeded from the Website's own public folder, e.g.
// "/images/logo.png") resolve against the Website's origin. Real uploads
// (this Dashboard's own upload flow, see uploadMediaFile in lib/api.ts) are
// backend-relative under "/uploads/..." and must resolve against the
// backend instead, or the browser requests them from whichever origin is
// currently loaded and 404s. A base64 data URL or an already-absolute URL
// is used exactly as given.
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3002";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function resolveMediaUrl(url: string): string {
  if (url.startsWith("/uploads/")) return `${API_URL}${url}`;
  return url.startsWith("/") ? `${WEBSITE_URL}${url}` : url;
}

const SECTION_LABEL_KEYS: Record<string, string> = {
  hero: "media.sectionHero",
  cta: "media.sectionCta",
  navbar: "media.sectionNavbar",
  footer: "media.sectionFooter",
  "article-cover-watermark": "media.sectionArticleWatermark",
  main: "media.sectionMain",
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function usageLabel(u: BackendMediaUsage, t: Translate): string {
  if (u.kind === "article") {
    const localeLabel = u.locale === "ar" ? t("media.localeAr") : t("media.localeEn");
    return t("media.articleUsageLabel", { title: u.articleTitle ?? "", locale: localeLabel });
  }
  const place = u.route ? (u.routeTitleAr ?? u.route) : t("media.globalUsage");
  const section = SECTION_LABEL_KEYS[u.section] ? t(SECTION_LABEL_KEYS[u.section]!) : u.section;
  return `${place} — ${section}`;
}

export function toMediaItem(m: BackendMedia, t: Translate): MediaItem {
  return {
    id: String(m.id),
    filename: m.filename,
    mimeType: m.mimeType,
    sizeKB: m.sizeKb,
    width: m.width ?? 0,
    height: m.height ?? 0,
    altText: { ar: m.altAr, en: m.altEn },
    uploaderName: m.uploadedBy ?? "—",
    uploadedAt: m.createdAt,
    usedIn: m.usedIn.map((u) => ({
      type: u.kind === "article" ? "article" : u.route ? "page" : "global",
      id: u.kind === "article" ? `article-${u.articleId}-${u.locale}` : (u.route ?? "global"),
      usageId: u.kind === "page" && u.id !== null ? u.id : undefined,
      label: usageLabel(u, t),
    })),
    accentColor: "linear-gradient(135deg,#4f6df5,#8b5cf6)",
    objectUrl: resolveMediaUrl(m.url),
  };
}
