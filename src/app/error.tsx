"use client";

import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";

// Root error boundary -- without this, any thrown error (a bad render, a
// rejected fetch bubbling up, etc.) falls through to Next's raw dev overlay
// or a blank screen in production, with no recovery path for admin users.
// Deliberately shows no error/stack detail -- just a generic message and a
// retry action, matching the Website's root error.tsx pattern.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useLanguage();
  const isArabic = lang === "ar";

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
