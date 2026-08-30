"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/blog/ArticleEditor";
import { ArticleEditorSkeleton } from "@/components/blog/ArticleEditorSkeleton";
import { EmptyState } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";

export default function ArticleEditorPage(props: PageProps<"/blog/[id]">) {
  const { t } = useLanguage();
  const { id } = use(props.params);
  const articleId = Number(id);

  const [article, setArticle] = useState<api.BackendArticle | null>(null);
  const [categories, setCategories] = useState<api.BackendCategory[] | null>(null);
  const [tags, setTags] = useState<api.BackendTag[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  const validId = Number.isInteger(articleId) && articleId > 0;

  useEffect(() => {
    if (!validId) return;
    let cancelled = false;
    Promise.all([api.fetchArticle(articleId), api.fetchCategories(), api.fetchTags()])
      .then(([a, c, t]) => {
        if (cancelled) return;
        setArticle(a);
        setCategories(c);
        setTags(t);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFoundFlag(true);
        } else {
          setLoadError(err instanceof ApiError ? err.message : t("blog.loadArticleError"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [articleId, validId, t]);

  if (!validId || notFoundFlag) notFound();
  if (loadError) {
    return <EmptyState icon="alert" title={t("blog.loadArticleError")} description={loadError} />;
  }
  if (!article || !categories) {
    return <ArticleEditorSkeleton />;
  }

  return <ArticleEditor article={article} categories={categories} tags={tags} />;
}
