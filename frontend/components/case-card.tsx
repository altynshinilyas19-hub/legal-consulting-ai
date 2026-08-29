import Link from "next/link";
import { ArrowUpRight, Landmark, MapPin, Scale } from "lucide-react";

import { FavoriteButton } from "@/components/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CaseRecord } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

export function CaseCard({
  record,
  compact = false,
  showAction = true,
  showFavorite = true,
}: {
  record: CaseRecord;
  compact?: boolean;
  showAction?: boolean;
  showFavorite?: boolean;
}) {
  return (
    <Card className={compact ? "p-5" : undefined}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {record.category ? <Badge>{record.category}</Badge> : null}
            {record.decision_date ? <Badge>{formatDate(record.decision_date)}</Badge> : null}
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {record.title || record.file_name}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {truncate(record.excerpt || record.content, compact ? 120 : 180)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-accent" />
            <span>{record.case_number || "Без номера"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-accent" />
            <span>{record.court_name || "Суд не указан"}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            <span>{record.region || "Регион не указан"}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{record.file_name}</div>
          {showAction || showFavorite ? (
            <div className="flex items-center gap-2">
              {showFavorite ? (
                <FavoriteButton
                  targetType="case"
                  targetId={record.id}
                  size="sm"
                  showLabel={!compact}
                />
              ) : null}
              {showAction ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/cases/${record.id}`}>
                    Открыть дело
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
