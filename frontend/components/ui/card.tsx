import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-border/70 bg-surface/90 p-6 shadow-panel backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
