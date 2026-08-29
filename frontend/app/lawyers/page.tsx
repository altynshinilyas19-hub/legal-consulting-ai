"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";

import { LawyerCard } from "@/components/lawyer-card";
import { PaginationControls } from "@/components/pagination-controls";
import { PublicHeader } from "@/components/public-header";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listLawyers } from "@/lib/api";
import type { LawyerRecord } from "@/lib/types";

const SPECIALIZATIONS = ["Корпоративное право", "Трудовое право", "Арбитраж и банкротство"];

export default function LawyersPage() {
  const [query, setQuery] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<LawyerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await listLawyers(query, specialization, page);
        setRecords(response.items);
        setTotal(response.total);
        setPageSize(response.page_size);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить список юристов.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page, query, specialization]);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Юридические эксперты"
          title="Свяжите AI-анализ с живой юридической экспертизой"
          description="Фильтруйте специалистов по направлениям, сравнивайте опыт и переходите от AI-вывода к профессиональной консультации."
          action={
            <Button asChild size="sm">
              <Link href="/register">
                Создать аккаунт
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />

        <div className="mt-8 space-y-4 rounded-[1.7rem] border border-border/70 bg-surface/80 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              className="pl-10"
              placeholder="Поиск по имени юриста или специализации"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={specialization === "" ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setPage(1);
                setSpecialization("");
              }}
            >
              Все
            </Button>
            {SPECIALIZATIONS.map((item) => (
              <Button
                key={item}
                variant={specialization === item ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setPage(1);
                  setSpecialization(item);
                }}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[300px] w-full" />
              ))}
            </div>
          ) : records.length ? (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                {records.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} />
                ))}
              </div>
              <div className="mt-6">
                <PaginationControls
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="Подходящие юристы не найдены"
              description="Попробуйте другую специализацию или более широкий поисковый запрос."
            />
          )}
        </div>
      </main>
    </div>
  );
}
