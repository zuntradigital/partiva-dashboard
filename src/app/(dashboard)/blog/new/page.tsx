"use client";

import { useEffect, useState } from "react";
import { ArticleEditor } from "@/components/blog/ArticleEditor";
import { ArticleEditorSkeleton } from "@/components/blog/ArticleEditorSkeleton";
import { EmptyState } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";

export default function NewArticlePage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<api.BackendCategory[] | null>(null);
  const [tags, setTags] = useState<api.BackendTag[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.fetchCategories(), api.fetchTags()])
      .then(([c, t]) => {
        if (cancelled) return;
        setCategories(c);
        setTags(t);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : t("blog.loadPageDataError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loadError) {
    return <EmptyState icon="alert" title={t("blog.loadPageError")} description={loadError} />;
  }
  if (!categories) {
    return <ArticleEditorSkeleton />;
  }

  return <ArticleEditor categories={categories} tags={tags} />;
}
