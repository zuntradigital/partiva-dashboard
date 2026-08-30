"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, Field, Input, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
            <span className="text-base font-bold text-white">P</span>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">Partiva</p>
            <p className="text-sm text-muted">قبول دعوة الانضمام إلى لوحة التحكم</p>
          </div>
        </div>
        <Card className="p-6">{children}</Card>
      </div>
    </div>
  );
}

function AcceptInvitationForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<api.InvitationDetails | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .verifyInvitation(token)
      .then((details) => {
        if (!cancelled) setInvitation(details);
      })
      .catch((err) => {
        if (!cancelled) setVerifyError(err instanceof ApiError ? err.message : "تعذّر التحقق من الدعوة");
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("يجب أن تتكوّن كلمة المرور من 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("كلمتا المرور غير متطابقتين");
      return;
    }

    setSubmitting(true);
    try {
      await api.acceptInvitation(token!, password);
      setAccepted(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "تعذّر إتمام العملية");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
          <Icon name="alert" className="h-5 w-5" />
        </div>
        <p className="text-sm text-foreground">رابط الدعوة غير صالح — تأكد من نسخ الرابط كاملًا من البريد الإلكتروني.</p>
      </div>
    );
  }

  if (verifying) {
    return <p className="text-center text-sm text-muted">جارٍ التحقق من الدعوة...</p>;
  }

  if (verifyError) {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger">
          <Icon name="alert" className="h-5 w-5" />
        </div>
        <p className="text-sm text-foreground">{verifyError}</p>
        <p className="text-xs text-muted-soft">تواصل مع المدير العام لإرسال دعوة جديدة إن لزم الأمر.</p>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
          <Icon name="check" className="h-5 w-5" />
        </div>
        <p className="text-sm text-foreground">تم تفعيل حسابك بنجاح، يمكنك الآن تسجيل الدخول.</p>
        <Link href="/login">
          <Button variant="primary" className="w-full justify-center">
            الذهاب إلى تسجيل الدخول
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 rounded-xl border border-border-soft bg-background-soft p-3.5">
        <p className="text-sm font-medium text-foreground">{invitation?.name}</p>
        <p className="text-xs text-muted">{invitation?.email}</p>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="brand">{invitation?.role}</Badge>
          {invitation?.expiresAt && (
            <span className="text-[11px] text-muted-soft">تنتهي الدعوة: {formatDateTime(invitation.expiresAt)}</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="كلمة المرور" htmlFor="password" required hint="8 أحرف على الأقل">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <Field label="تأكيد كلمة المرور" htmlFor="confirmPassword" required>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <Button type="submit" variant="primary" className="w-full justify-center" disabled={submitting}>
          {submitting ? "جارٍ التفعيل..." : "تفعيل الحساب"}
        </Button>
      </form>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-center text-sm text-muted">جارٍ التحميل...</p>}>
        <AcceptInvitationForm />
      </Suspense>
    </Shell>
  );
}
