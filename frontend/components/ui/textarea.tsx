import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-3xl border border-input bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition",
        "placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
