import type { Lang } from "@/lib/i18n";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const arDateFormatter = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const enDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const arDateTimeFormatter = new Intl.DateTimeFormat("ar-SA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const enDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string, lang: Lang = "ar"): string {
  return (lang === "ar" ? arDateFormatter : enDateFormatter).format(new Date(iso));
}

export function formatDateTime(iso: string, lang: Lang = "ar"): string {
  return (lang === "ar" ? arDateTimeFormatter : enDateTimeFormatter).format(new Date(iso));
}

export function timeAgo(iso: string, lang: Lang = "ar"): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (lang === "en") {
    if (seconds < 60) return "just now";
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    if (seconds < 86400 * 30) {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }
    const months = Math.floor(seconds / (86400 * 30));
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  if (seconds < 60) return "منذ لحظات";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `منذ ${minutes} ${minutes === 1 ? "دقيقة" : "دقائق"}`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  }
  if (seconds < 86400 * 30) {
    const days = Math.floor(seconds / 86400);
    return `منذ ${days} ${days === 1 ? "يوم" : "أيام"}`;
  }
  const months = Math.floor(seconds / (86400 * 30));
  return `منذ ${months} ${months === 1 ? "شهر" : "أشهر"}`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
