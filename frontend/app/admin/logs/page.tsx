"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminLogs } from "@/lib/api";
import { getAdminActionLabel, getAdminTargetLabel } from "@/lib/admin-log-labels";
import type { AdminLog } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminLogs();
        setLogs(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить AI-логи.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AI-логи"
        title="Журнал AI и административных событий"
        description="Отслеживайте консультации AI, административные изменения и действия с юридическими материалами в одном журнале."
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : logs.length ? (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="gap-2">
                      <Activity className="size-3.5" />
                      {getAdminActionLabel(log.action)}
                    </Badge>
                    <Badge>{getAdminTargetLabel(log.target_type)}</Badge>
                    {log.target_id ? <Badge>ID: {log.target_id}</Badge> : null}
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    {log.admin_id ? `Администратор #${log.admin_id}` : "Системное событие"}
                  </div>
                </div>

                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {formatDate(log.created_at)}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-border/70 bg-surface/70 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Данные события
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                  {truncate(JSON.stringify(log.payload || {}, null, 2), 1200)}
                </pre>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Логи пока отсутствуют"
          description="Когда система начнёт фиксировать AI-консультации и административные действия, записи появятся здесь."
        />
      )}
    </div>
  );
}
