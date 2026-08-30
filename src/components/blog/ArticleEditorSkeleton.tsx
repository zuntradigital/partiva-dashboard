import { Card, Skeleton } from "@/components/ui";

// Mirrors ArticleEditor's own shape (header + 2-col content / 1-col sidebar)
// so the page doesn't blank out then jump once the article/categories load.
export function ArticleEditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="space-y-4 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <div className="space-y-4 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
