import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, BriefcaseBusiness, Star } from "lucide-react";

import { FavoriteButton } from "@/components/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveLawyerPhotoSrc } from "@/lib/lawyer-images";
import type { LawyerRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function LawyerCard({
  lawyer,
  compact = false,
  showAction = true,
  showFavorite = true,
}: {
  lawyer: LawyerRecord;
  compact?: boolean;
  showAction?: boolean;
  showFavorite?: boolean;
}) {
  const photoSrc = resolveLawyerPhotoSrc(lawyer.photo_url, lawyer.id);

  return (
    <Card className={compact ? "p-5" : undefined}>
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-surface-elevated">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt={lawyer.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{lawyer.name}</h3>
              <p className="text-sm text-muted-foreground">{lawyer.specialization}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{lawyer.experience_years} лет практики</Badge>
              <Badge className="gap-1">
                <Star className="size-3.5 fill-current" />
                {lawyer.rating.toFixed(1)}
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{lawyer.description}</p>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="size-4 text-accent" />
            <span>{formatCurrency(lawyer.consultation_price)}</span>
          </div>
          <div className="truncate">{lawyer.contacts.email || lawyer.contacts.phone || "Контакты по запросу"}</div>
        </div>

        {showAction || showFavorite ? (
          <div className="mt-auto flex justify-end gap-2">
            {showFavorite ? (
              <FavoriteButton
                targetType="lawyer"
                targetId={lawyer.id}
                size="sm"
                showLabel={!compact}
              />
            ) : null}
            {showAction ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/lawyers/${lawyer.id}`}>
                  Профиль
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
