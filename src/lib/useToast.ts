"use client";

import { useCallback, useState } from "react";
import type { ToastItem } from "@/components/ui/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((variant: ToastItem["variant"], message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, variant, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
