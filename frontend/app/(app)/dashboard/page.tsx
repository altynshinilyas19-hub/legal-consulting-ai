"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpenText,
  FolderHeart,
  MessageSquareText,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ArticleCard } from "@/components/article-card";
import { LawyerCard } from "@/components/lawyer-card";
import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { getMyFavorites, getMyHistory, listArticles, listLawyers } from "@/lib/api";
import type { ArticleRecord, Favorite, LawyerRecord, ChatSummary } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ChatSummary[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [lawyers, setLawyers] = useState<LawyerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const [historyData, favoriteData, articleData, lawyerData] = await Promise.all([
          getMyHistory(),
          getMyFavorites(),
          listArticles("", "", 1),
          listLawyers("", "", 1),
        ]);

        setHistory(historyData);
        setFavorites(favoriteData);
        setArticles(articleData.items.slice(0, 1));
        setLawyers(lawyerData.items.slice(0, 1));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить панель управления.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Личный кабинет"
        title={`С возвращением${user?.full_name ? `, ${user.full_name}` : ""}`}
        description="Здесь собраны консультации, сохранённые материалы и быстрый доступ к основным разделам."
        action={
          <Button asChild size="sm">
            <Link href="/chat">Открыть AI-чат</Link>
          </Button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Консультации"
          value={history.length}
          hint="Сохранённые диалоги в вашем кабинете."
          icon={<MessageSquareText className="size-5" />}
        />
        <StatCard
          label="Избранное"
          value={favorites.length}
          hint="Дела, юристы и материалы для дальнейшей работы."
          icon={<FolderHeart className="size-5" />}
        />
        <StatCard
          label="Публикации"
          value={articles.length}
          hint="Новые статьи и аналитика платформы."
          icon={<BookOpenText className="size-5" />}
        />
        <StatCard
          label="Юристы"
          value={lawyers.length}
          hint="Эксперты, доступные для подключения к вопросу."
          icon={<Users className="size-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">История</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Последние консультации</div>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/chat">Открыть чат</Link>
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)
            ) : history.length ? (
              history.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={`/chat?chat=${item.id}`}
                  className="block rounded-[1.4rem] border border-border/70 bg-surface-elevated p-4 transition hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        {truncate(item.preview || "Ответ AI пока не получен.", 120)}
                      </div>
                    </div>
                    <Badge>{item.messages_count} сообщ.</Badge>
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {formatDate(item.updated_at)}
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="История пока пуста"
                description="Начните консультацию, и диалог сразу появится в этом блоке."
                action={
                  <Button asChild size="sm">
                    <Link href="/chat">Начать консультацию</Link>
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Быстрые действия</div>
          <div className="mt-5 grid gap-3">
            <Button asChild className="justify-between">
              <Link href="/chat">
                AI-консультация
                <Sparkles className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-between">
              <Link href="/cases">
                Открыть дела
                <Scale className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-between">
              <Link href="/lawyers">
                Найти юриста
                <Users className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="justify-between">
              <Link href="/favorites">
                Перейти в избранное
                <FolderHeart className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-border/70 bg-surface/60 p-4">
            <div className="text-sm font-semibold text-foreground">Сохранённые материалы</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{favorites.length}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Держите важные дела, юристов и статьи под рукой в одном списке.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Материал дня"
            title="Полезная публикация"
            description="Короткая подборка для быстрого входа в тему."
          />
          <div className="mt-6">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : articles[0] ? (
              <ArticleCard article={articles[0]} compact />
            ) : (
              <EmptyState
                title="Публикации пока недоступны"
                description="Как только появятся новые материалы, они отобразятся здесь."
              />
            )}
          </div>
        </div>

        <div>
          <SectionHeading
            eyebrow="Эксперт дня"
            title="Рекомендуемый юрист"
            description="Живой специалист, которого можно быстро открыть из кабинета."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/lawyers">Все юристы</Link>
              </Button>
            }
          />
          <div className="mt-6">
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : lawyers[0] ? (
              <LawyerCard lawyer={lawyers[0]} compact />
            ) : (
              <EmptyState
                title="Юристы пока недоступны"
                description="Когда в базе появятся профили, здесь будет быстрый доступ к ним."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
