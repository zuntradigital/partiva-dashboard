import { cn } from "@/lib/utils";

const GRADIENTS = [
  "linear-gradient(135deg,#4f6df5,#8b5cf6)",
  "linear-gradient(135deg,#22d3ee,#4f6df5)",
  "linear-gradient(135deg,#f59e0b,#f43f5e)",
  "linear-gradient(135deg,#22c55e,#4f6df5)",
  "linear-gradient(135deg,#8b5cf6,#22d3ee)",
];

function gradientFor(seed: string) {
  const index = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[index];
}

export function Avatar({ name, initials, size = 36, className }: { name: string; initials: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white", className)}
      style={{ width: size, height: size, backgroundImage: gradientFor(name) }}
    >
      {initials}
    </div>
  );
}
