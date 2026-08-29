import { Scale } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-panel">
        <Scale className="size-5" />
      </div>
      <div>
        <div className="font-serif text-xl font-semibold tracking-tight text-foreground">ЮристКонсультат</div>
        <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">AI-юридический помощник</div>
      </div>
    </div>
  );
}
