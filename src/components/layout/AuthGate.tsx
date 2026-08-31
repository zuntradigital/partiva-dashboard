"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSession();
  const { t } = useLanguage();
  const router = useRouter();

  // useSession() is backed by useSyncExternalStore, which -- correctly, to
  // avoid a hydration mismatch in what gets *rendered* -- reports the SSR
  // value (always unauthenticated) for the first client render after
  // hydration, before it can resync to the real localStorage-backed value.
  // That's fine for rendered content, but redirecting on it is a bug: it
  // sends a genuinely authenticated user to /login for one render, which
  // immediately bounces them back, which re-triggers this exact race on the
  // fresh mount -- a redirect loop. `settled` defers the redirect decision
  // (not the placeholder, which can render either way with no mismatch) to
  // the render after mount, by which point isAuthenticated already reflects
  // the real client value.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(true);
  }, []);

  useEffect(() => {
    if (settled && !isAuthenticated) router.replace("/login");
  }, [settled, isAuthenticated, router]);

  if (!settled || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">{t("common.verifyingSession")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
