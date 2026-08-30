"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSession();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">{t("common.verifyingSession")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
