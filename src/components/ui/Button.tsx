import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-gradient-brand text-white shadow-glow hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100",
  secondary: "bg-surface-hover text-foreground hover:bg-border disabled:opacity-50",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50",
  danger: "bg-danger/15 text-danger hover:bg-danger/25 disabled:opacity-50",
  outline: "border border-border text-foreground hover:bg-surface-hover disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-9 w-9 justify-center",
};

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center rounded-xl font-medium transition-all duration-150 cursor-pointer active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
