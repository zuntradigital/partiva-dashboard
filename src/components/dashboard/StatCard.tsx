import { Icon, type IconName } from "@/components/icons";
import { Card } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { useCountUp } from "@/lib/useCountUp";

export function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: IconName;
  label: string;
  value: number;
  sublabel?: string;
  accent: string;
}) {
  const displayValue = useCountUp(value);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(displayValue)}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundImage: accent }}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
      {sublabel && <p className="mt-3 text-xs text-muted-soft">{sublabel}</p>}
    </Card>
  );
}
