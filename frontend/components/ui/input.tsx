import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground outline-none transition",
        "placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
