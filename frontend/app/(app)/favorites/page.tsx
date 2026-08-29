"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ArticleCard } from "@/components/article-card";
import { CaseCard } from "@/components/case-card";
import { syncFavoriteStore } from "@/components/favorite-button";
import { LawyerCard } from "@/components/lawyer-card";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getArticle,
  getCase,
  getLawyer,
  getMyFavorites,
  removeFavorite,
} from "@/lib/api";
import type { ArticleRecord, CaseRecord, Favorite, LawyerRecord } from "@/lib/types";

type ResolvedFavorite =
  | { favorite: Favorite; type: "case"; record: CaseRecord }
  | { favorite: Favorite; type: "lawyer"; record: LawyerRecord }
  | { favorite: Favorite; type: "article"; record: ArticleRecord }
  | { favorite: Favorite; type: "unknown"; record: null };

export default function FavoritesPage() {
  const [items, setItems] = useState<ResolvedFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const favorites = await getMyFavorites();
        const resolved = await Promise.all(
          favorites.map(async (favorite): Promise<ResolvedFavorite> => {
            try {
              if (favorite.target_type === "case") {
                return { favorite, type: "case", record: await getCase(Number(favorite.target_id)) };
              }
              if (favorite.target_type === "lawyer") {
                return { favorite, type: "lawyer", record: await getLawyer(Number(favorite.target_id)) };
              }
              if (favorite.target_type === "article") {
                return { favorite, type: "article", record: await getArticle(Number(favorite.target_id)) };
              }
            } catch {
              return { favorite, type: "unknown", record: null };
            }
            return { favorite, type: "unknown", record: null };
          }),
        );
        syncFavoriteStore(favorites);
        setItems(resolved);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить избранное.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleRemove = async (favoriteId: string) => {
    try {
      await removeFavorite(favoriteId);
      setItems((current) => {
        const next = current.filter((item) => item.favorite.id !== favoriteId);
        syncFavoriteStore(next.map((item) => item.favorite));
        return next;
      });
      toast.success("Материал удален из избранного.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить материал из избранного.");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Сохраненные материалы"
        title="Избранное"
        description="Храните важные дела, статьи и юристов под рукой для быстрого доступа."
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[280px] w-full" />
          ))}
        </div>
      ) : items.length ? (
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.favorite.id} className="space-y-3">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => void handleRemove(item.favorite.id)}>
                  Удалить
                </Button>
              </div>
              {item.type === "case" ? <CaseCard record={item.record} showFavorite={false} /> : null}
              {item.type === "lawyer" ? <LawyerCard lawyer={item.record} showFavorite={false} /> : null}
              {item.type === "article" ? <ArticleCard article={item.record} showFavorite={false} /> : null}
              {item.type === "unknown" ? (
                <Card>
                  <div className="space-y-3">
                    <div className="text-lg font-semibold tracking-tight text-foreground">Запись недоступна</div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Эта запись в избранном ссылается на материал, который больше недоступен.
                    </p>
                  </div>
                </Card>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Избранное пока пусто"
          description="Сохраняйте дела и специалистов во время работы, чтобы быстро возвращаться к ним позже."
          action={
            <Button asChild size="sm">
              <Link href="/cases">Перейти к делам</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
