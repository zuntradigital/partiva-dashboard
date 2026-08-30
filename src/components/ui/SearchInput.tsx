import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="search" className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
      <input
        className="w-full rounded-xl border border-border bg-background-soft py-2.5 ps-10 pe-3.5 text-sm text-foreground placeholder:text-muted-soft outline-none focus:border-primary"
        {...props}
      />
    </div>
  );
}
