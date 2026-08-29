"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router, user]);

  if (loading || !user || !isAdmin) {
    return (
      <Card className="mx-auto max-w-xl">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Доступ администратора</div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Проверяем права доступа</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Проверяем вашу роль и подготавливаем административную панель.
          </p>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
