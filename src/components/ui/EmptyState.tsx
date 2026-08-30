import { Icon, type IconName } from "@/components/icons";

export function EmptyState({
  icon = "pages",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-muted">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
