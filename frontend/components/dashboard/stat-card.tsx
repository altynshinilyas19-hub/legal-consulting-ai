import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/60 to-warning/60" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
          <div className="text-sm leading-6 text-muted-foreground">{hint}</div>
        </div>
        {icon ? (
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
