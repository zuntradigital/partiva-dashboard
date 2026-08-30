"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Button } from "@/components/ui";
import * as api from "@/lib/api";
import { ApiError, SESSION_EXPIRED_FLAG } from "@/lib/api";
import { getStoredSession, setStoredSession } from "@/lib/auth-storage";
import { ThemeToggle, LanguageToggle } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Chrome ignores autoComplete="off" on login forms and force-fills a saved
  // credential on page load. It won't touch a readOnly field, so the fields
  // start locked and only become editable once the user actually focuses one.
  const [locked, setLocked] = useState(true);
  const unlock = () => setLocked(false);

  useEffect(() => {
    if (getStoredSession()) router.replace("/");
  }, [router]);

  // Set by apiFetch (lib/api.ts) right before it clears an expired/invalid
  // session and AuthGate redirects here -- read once so the user sees why
  // they landed back on Login instead of it looking like a silent failure.
  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_EXPIRED_FLAG)) {
      window.sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      setError(t("login.sessionExpired"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.login(email, password);
      setStoredSession(result);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute end-4 top-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
            <span className="text-base font-bold text-white">P</span>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">Partiva</p>
            <p className="text-sm text-muted">{t("login.subtitle")}</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <Field label={t("login.emailLabel")} htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                readOnly={locked}
                onFocus={unlock}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@partiva.com"
              />
            </Field>

            <Field label={t("login.passwordLabel")} htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="off"
                readOnly={locked}
                onFocus={unlock}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={loading}>
              {loading ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
