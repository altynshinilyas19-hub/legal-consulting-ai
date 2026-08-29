"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminUpdateUser, adminUsers } from "@/lib/api";
import type { AdminUserRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminUsers();
        setUsers(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить список пользователей.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handlePatch = async (userId: number, payload: Partial<Pick<AdminUserRow, "role" | "is_blocked">>) => {
    try {
      await adminUpdateUser(userId, payload);
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, ...payload } as AdminUserRow : user)),
      );
      toast.success("Данные пользователя обновлены.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить пользователя.");
    }
  };

  const filtered = users.filter((user) =>
    `${user.email} ${user.full_name || ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Пользователи"
        title="Управление доступом и статусом аккаунтов"
        description="Назначайте администраторов, блокируйте недобросовестные аккаунты и контролируйте список зарегистрированных пользователей."
      />

      <Card className="space-y-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по email или имени"
        />
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)
          ) : (
            filtered.map((user) => (
              <div key={user.id} className="rounded-[1.4rem] border border-border/70 bg-surface-elevated p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{user.role === "admin" ? "Админ" : "Пользователь"}</Badge>
                      {user.is_blocked ? <Badge className="border-danger/30 text-danger">Заблокирован</Badge> : null}
                    </div>
                    <div className="text-lg font-semibold tracking-tight text-foreground">
                      {user.full_name || user.email}
                    </div>
                    <div className="text-sm leading-6 text-muted-foreground">{user.email}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Создан {formatDate(user.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handlePatch(user.id, { role: user.role === "admin" ? "user" : "admin" })}
                    >
                      {user.role === "admin" ? "Сделать пользователем" : "Сделать админом"}
                    </Button>
                    <Button
                      size="sm"
                      variant={user.is_blocked ? "secondary" : "danger"}
                      onClick={() => void handlePatch(user.id, { is_blocked: !user.is_blocked })}
                    >
                      {user.is_blocked ? "Разблокировать" : "Заблокировать"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
