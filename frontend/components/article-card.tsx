import { BookOpenText, Newspaper } from "lucide-react";

import { FavoriteButton } from "@/components/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ArticleRecord } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

export function ArticleCard({
  article,
  compact = false,
  showFavorite = true,
}: {
  article: ArticleRecord;
  compact?: boolean;
  showFavorite?: boolean;
}) {
  const Icon = article.kind === "news" ? Newspaper : BookOpenText;
  const articleKindLabel = article.kind === "news" ? "Новость" : "Статья";

  return (
    <Card className={compact ? "p-5" : undefined}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="gap-2">
            <Icon className="size-3.5" />
            {articleKindLabel}
          </Badge>
          {article.published_at ? <Badge>{formatDate(article.published_at)}</Badge> : null}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{article.title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {truncate(article.excerpt || article.content, compact ? 120 : 180)}
          </p>
        </div>
        {showFavorite ? (
          <div className="flex justify-end">
            <FavoriteButton
              targetType="article"
              targetId={article.id}
              size="sm"
              showLabel={!compact}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
