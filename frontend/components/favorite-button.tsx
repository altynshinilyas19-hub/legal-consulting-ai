"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { addFavorite, getMyFavorites, removeFavorite } from "@/lib/api";
import type { Favorite, FavoriteTargetType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FavoriteButtonProps = {
  targetType: FavoriteTargetType;
  targetId: number | string;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
};

type FavoriteListener = (items: Favorite[] | null) => void;

const favoriteStore = {
  ownerId: null as number | null,
  items: null as Favorite[] | null,
  promise: null as Promise<Favorite[]> | null,
  listeners: new Set<FavoriteListener>(),
};

function broadcastFavorites(items: Favorite[] | null) {
  favoriteStore.items = items;
  favoriteStore.listeners.forEach((listener) => listener(items));
}

export function syncFavoriteStore(items: Favorite[] | null) {
  favoriteStore.promise = null;
  broadcastFavorites(items);
}

function syncFavoriteOwner(userId: number | null) {
  if (favoriteStore.ownerId === userId) {
    return;
  }

  favoriteStore.ownerId = userId;
  favoriteStore.promise = null;
  broadcastFavorites(userId ? null : []);
}

async function ensureFavoritesLoaded() {
  if (favoriteStore.items !== null) {
    return favoriteStore.items;
  }

  if (favoriteStore.promise) {
    return favoriteStore.promise;
  }

  favoriteStore.promise = getMyFavorites()
    .then((items) => {
      favoriteStore.promise = null;
      broadcastFavorites(items);
      return items;
    })
    .catch((error) => {
      favoriteStore.promise = null;
      throw error;
    });

  return favoriteStore.promise;
}

function updateFavoriteStore(updater: (items: Favorite[]) => Favorite[]) {
  const nextItems = updater(favoriteStore.items ?? []);
  broadcastFavorites(nextItems);
}

function findFavorite(items: Favorite[] | null, targetType: FavoriteTargetType, targetId: string) {
  return items?.find((item) => item.target_type === targetType && item.target_id === targetId) ?? null;
}

export function FavoriteButton({
  targetType,
  targetId,
  className,
  showLabel = true,
  size = "sm",
}: FavoriteButtonProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const normalizedTargetId = useMemo(() => String(targetId), [targetId]);
  const [favorite, setFavorite] = useState<Favorite | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    syncFavoriteOwner(user?.id ?? null);

    const sync = (items: Favorite[] | null) => {
      setFavorite(findFavorite(items, targetType, normalizedTargetId));
      setHydrated(items !== null || !user);
    };

    favoriteStore.listeners.add(sync);
    sync(favoriteStore.items);

    if (user) {
      void ensureFavoritesLoaded().catch(() => {
        setHydrated(true);
      });
    } else {
      setHydrated(true);
    }

    return () => {
      favoriteStore.listeners.delete(sync);
    };
  }, [normalizedTargetId, targetType, user]);

  const handleClick = async () => {
    if (loading || submitting) {
      return;
    }

    if (!user) {
      toast.info("Войдите в аккаунт, чтобы сохранять материалы в избранное.");
      router.push(pathname ? `/login?next=${encodeURIComponent(pathname)}` : "/login");
      return;
    }

    setSubmitting(true);

    try {
      if (favorite) {
        await removeFavorite(favorite.id);
        updateFavoriteStore((items) => items.filter((item) => item.id !== favorite.id));
        toast.success("Материал удален из избранного.");
      } else {
        const savedFavorite = await addFavorite({
          target_type: targetType,
          target_id: normalizedTargetId,
        });
        updateFavoriteStore((items) => {
          const nextItems = items.filter((item) => item.id !== savedFavorite.id);
          return [savedFavorite, ...nextItems];
        });
        toast.success("Материал сохранен в избранное.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить избранное.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || (!!user && !hydrated);
  const label = favorite ? "Сохранено" : "Сохранить";

  return (
    <Button
      type="button"
      variant={favorite ? "secondary" : "ghost"}
      size={size}
      className={cn("shrink-0", !showLabel && "px-2.5", className)}
      onClick={() => void handleClick()}
      disabled={busy || loading}
      aria-pressed={Boolean(favorite)}
      title={label}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Heart className={cn("size-4", favorite && "fill-current text-accent")} />
      )}
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </Button>
  );
}
