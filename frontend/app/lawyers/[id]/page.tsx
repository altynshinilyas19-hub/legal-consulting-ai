"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Star } from "lucide-react";
import { toast } from "sonner";

import { FavoriteButton } from "@/components/favorite-button";
import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLawyer } from "@/lib/api";
import type { LawyerRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function LawyerDetailsPage() {
  const params = useParams<{ id: string }>();
  const [lawyer, setLawyer] = useState<LawyerRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await getLawyer(params.id);
        setLawyer(response);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить профиль юриста.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[480px] w-full" />
        </main>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="space-y-4 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Юрист не найден</h1>
            <p className="text-sm leading-7 text-muted-foreground">
              Запрошенный профиль недоступен или временно отключен.
            </p>
            <Button asChild>
              <Link href="/lawyers">Назад к юристам</Link>
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/lawyers">
              <ArrowLeft className="size-4" />
              Назад к юристам
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge>{lawyer.specialization}</Badge>
            <Badge>{lawyer.experience_years} лет практики</Badge>
            <Badge className="gap-1">
              <Star className="size-3.5 fill-current" />
              {lawyer.rating.toFixed(1)}
            </Badge>
          </div>
          <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground">{lawyer.name}</h1>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Профессиональный профиль</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Почему этому специалисту доверяют</h2>
            </div>
            <p className="text-base leading-8 text-muted-foreground">{lawyer.description}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-border/70 bg-surface-elevated p-4">
                <div className="text-sm text-muted-foreground">Стоимость консультации</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(lawyer.consultation_price)}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-border/70 bg-surface-elevated p-4">
                <div className="text-sm text-muted-foreground">Специализация</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {lawyer.specialization}
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Контакты</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Связаться с юристом</h2>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-surface-elevated px-4 py-3">
                <Mail className="size-4 text-accent" />
                <span>{lawyer.contacts.email || "Электронная почта по запросу"}</span>
              </div>
              <div className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-surface-elevated px-4 py-3">
                <Phone className="size-4 text-accent" />
                <span>{lawyer.contacts.phone || "Телефон по запросу"}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <FavoriteButton targetType="lawyer" targetId={lawyer.id} size="md" className="w-full" />
              <Button asChild className="w-full">
                <Link href="/register">Запросить консультацию</Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
