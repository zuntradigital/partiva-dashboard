import { cn } from "@/lib/utils";
import { Icon } from "@/components/icons";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseClasses =
  "w-full rounded-xl border border-border bg-background-soft px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-soft outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseClasses, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(baseClasses, "appearance-none pe-9", className)} {...props}>
        {children}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
