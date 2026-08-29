"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, FileText, MessageSquareText, Shield, Users } from "lucide-react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminLogs, adminOverview } from "@/lib/api";
import { getAdminActionLabel, getAdminTargetLabel } from "@/lib/admin-log-labels";
import type { AdminLog, AdminOverview } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [overviewData, logsData] = await Promise.all([adminOverview(), adminLogs()]);
        setOverview(overviewData);
        setLogs(logsData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить обзор админ-панели.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Админ-панель"
        title="Центр управления платформой"
        description="Контролируйте пользователей, AI-активность, диалоги и актуальную юридическую базу из единого интерфейса."
      />

      {loading || !overview ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Пользователи" value={overview.users_total} hint="Зарегистрированные аккаунты" icon={<Users className="size-5" />} />
          <StatCard label="Заблокировано" value={overview.blocked_users} hint="Аккаунты с ограничением доступа" icon={<Shield className="size-5" />} />
          <StatCard label="Диалоги" value={overview.chats_total} hint="Сохранённые консультации" icon={<MessageSquareText className="size-5" />} />
          <StatCard label="AI-запросы" value={overview.ai_requests_total} hint="Вызовы AI, зафиксированные в логах" icon={<Bot className="size-5" />} />
          <StatCard label="Дела" value={overview.cases_total} hint="Судебные материалы в базе" icon={<FileText className="size-5" />} />
          <StatCard label="Юристы" value={overview.lawyers_total} hint="Опубликованные профили экспертов" icon={<Users className="size-5" />} />
          <StatCard label="Статьи" value={overview.articles_total} hint="Опубликованные материалы и новости" icon={<FileText className="size-5" />} />
          <StatCard label="AI-логи" value={overview.admin_logs_total} hint="Аудируемые административные события" icon={<Activity className="size-5" />} />
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Лента аудита</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Последняя активность админ-панели</div>
          </div>
          <Badge>{logs.length} записей</Badge>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-[1.4rem] border border-border/70 bg-surface-elevated p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{getAdminActionLabel(log.action)}</Badge>
                    <Badge>{getAdminTargetLabel(log.target_type)}</Badge>
                  </div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {formatDate(log.created_at)}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {truncate(JSON.stringify(log.payload || {}, null, 2), 180)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
