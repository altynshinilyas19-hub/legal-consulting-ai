"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

import { CaseCard } from "@/components/case-card";
import { FavoriteButton } from "@/components/favorite-button";
import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getCase, getRelatedCases } from "@/lib/api";
import type { CaseRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(content: string, query: string) {
  if (!query.trim()) {
    return content.split(/\n{2,}/).map((paragraph, index) => (
      <p key={`${paragraph.slice(0, 16)}-${index}`} className="leading-8 text-foreground">
        {paragraph}
      </p>
    ));
  }

  const normalizedQuery = query.toLowerCase();
  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return content.split(/\n{2,}/).map((paragraph, index) => (
    <p key={`${paragraph.slice(0, 16)}-${index}`} className="leading-8 text-foreground">
      {paragraph.split(regex).map((part, partIndex) =>
        part.toLowerCase() === normalizedQuery ? (
          <mark key={partIndex} className="rounded-md bg-warning/25 px-1 text-foreground">
            {part}
          </mark>
        ) : (
          <Fragment key={partIndex}>{part}</Fragment>
        ),
      )}
    </p>
  ));
}

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [related, setRelated] = useState<CaseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [caseRecord, relatedCases] = await Promise.all([
          getCase(params.id),
          getRelatedCases(params.id),
        ]);
        setRecord(caseRecord);
        setRelated(relatedCases);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить дело.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id]);

  const matchCount = useMemo(() => {
    if (!record || !search.trim()) {
      return 0;
    }
    const matches = record.content.match(new RegExp(escapeRegExp(search), "gi"));
    return matches?.length ?? 0;
  }, [record, search]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[520px] w-full" />
        </main>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Card>
            <div className="space-y-4 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Дело не найдено</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                Запрошенное дело недоступно или было удалено из активной базы.
              </p>
              <Button asChild>
                <Link href="/cases">Назад к делам</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases">
                <ArrowLeft className="size-4" />
                Назад к делам
              </Link>
            </Button>
            <div className="flex flex-wrap gap-2">
              {record.category ? <Badge>{record.category}</Badge> : null}
              {record.decision_date ? <Badge>{formatDate(record.decision_date)}</Badge> : null}
              {record.case_number ? <Badge>{record.case_number}</Badge> : null}
            </div>
            <h1 className="max-w-4xl font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {record.title || record.file_name}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground">
              {record.excerpt || "Полный текст судебного решения с метаданными и похожими делами."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton targetType="case" targetId={record.id} size="md" />
            {record.source_url ? (
              <Button asChild variant="secondary">
                <Link href={record.source_url} target="_blank">
                  Открыть источник
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Текст дела</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Полный текст судебного решения</div>
              </div>
              <div className="w-full max-w-sm">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-10"
                    placeholder="Поиск по тексту дела"
                  />
                </div>
                {search.trim() ? (
                  <div className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Найдено совпадений: {matchCount}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 rounded-[1.6rem] border border-border/70 bg-surface-elevated p-5">
              {renderHighlightedText(record.content, search)}
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Метаданные</div>
              <div className="mt-5 grid gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Суд</div>
                  <div className="mt-1 font-medium text-foreground">{record.court_name || "Не указано"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Регион</div>
                  <div className="mt-1 font-medium text-foreground">{record.region || "Не указано"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Файл</div>
                  <div className="mt-1 font-medium text-foreground">{record.file_name}</div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="text-xl font-semibold tracking-tight text-foreground">Похожие дела</div>
              {related.map((item) => (
                <CaseCard key={item.id} record={item} compact />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
