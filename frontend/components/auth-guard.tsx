"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="h-[520px] w-full" />
          <Card className="space-y-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-14 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
