"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";

const CHUNK_RELOAD_FLAG = "partiva_chunk_reload_attempted";

// A deploy replaces the previous build's /_next/static chunk files in place,
// so a tab that's been open (or navigated client-side) since before a new
// deploy can still hold a reference to an old chunk hash that no longer
// exists on the server -- webpack's dynamic import() then rejects with
// ChunkLoadError. reset() can't fix this: it just re-renders with the same
// already-broken module registry. A real navigation is the only recovery --
// it fetches a fresh HTML document (never cached, see app/layout.tsx's
// `dynamic = "force-dynamic"`) referencing the current build's chunks. The
// sessionStorage flag caps this at one automatic attempt so a persistent
// failure falls through to the manual retry UI instead of reload-looping.
function isChunkLoadError(error: Error): boolean {
  return error.name === "ChunkLoadError" || /Loading chunk [\w.-]+ failed/i.test(error.message);
}

function hasAttemptedChunkReload(): boolean {
  try {
    return window.sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
  } catch {
    return false;
  }
}

// Root error boundary -- without this, any thrown error (a bad render, a
// rejected fetch bubbling up, etc.) falls through to Next's raw dev overlay
// or a blank screen in production, with no recovery path for admin users.
// Deliberately shows no error/stack detail -- just a generic message and a
// retry action, matching the Website's root error.tsx pattern.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useLanguage();
  const isArabic = lang === "ar";

  const willAutoReload = isChunkLoadError(error) && !hasAttemptedChunkReload();

  useEffect(() => {
    if (!willAutoReload) return;
    try {
      window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
    } catch {
      // Storage unavailable -- fall through to the manual retry UI below
      // rather than risk reloading without the loop guard set.
      return;
    }
    window.location.reload();
  }, [willAutoReload]);

  // Render nothing while the automatic reload above is in flight, so the
  // user sees a brief blank frame instead of a flash of "Something went
  // wrong" for a failure that's about to fix itself. If this fires again
  // right after a reload (flag already set), that guard is off and the
  // normal retry UI below renders instead of looping forever.
  if (willAutoReload) {
    return null;
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <Icon name="alert" className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-muted">
          {isArabic ? "حدث خطأ غير متوقع. حاول مرة أخرى." : "Something went wrong. Please try again."}
        </p>
        <Button variant="primary" onClick={reset}>
          {isArabic ? "إعادة المحاولة" : "Try again"}
        </Button>
      </div>
    </div>
  );
}
