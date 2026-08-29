import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-2xl bg-[linear-gradient(110deg,hsl(var(--surface))_8%,hsl(var(--surface-elevated))_18%,hsl(var(--surface))_33%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
