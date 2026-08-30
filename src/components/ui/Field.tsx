import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  trailing?: React.ReactNode;
}

export function Field({ label, htmlFor, required, hint, error, children, className, trailing }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-soft">{hint}</p>
      ) : null}
    </div>
  );
}

export function CharCounter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span className={cn("text-xs tabular-nums", over ? "font-semibold text-danger" : "text-muted-soft")}>
      {value}/{max}
    </span>
  );
}
