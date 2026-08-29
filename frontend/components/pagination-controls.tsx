"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3 rounded-[1.4rem] border border-border/70 bg-surface/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        Страница {page} из {totalPages}. Всего результатов: {total}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
          Назад
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Далее
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
