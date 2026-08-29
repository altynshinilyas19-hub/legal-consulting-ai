"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { CaseCard } from "@/components/case-card";
import { PaginationControls } from "@/components/pagination-controls";
import { PublicHeader } from "@/components/public-header";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listCases } from "@/lib/api";
import type { CaseRecord } from "@/lib/types";

export default function CasesPage() {
  const [query, setQuery] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<CaseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await listCases(query, page);
        setRecords(response.items);
        setTotal(response.total);
        setPageSize(response.page_size);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить судебные дела.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page, query]);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Судебная база"
          title="Поиск судебной практики и полных текстов решений"
          description="Изучайте структурированные судебные материалы, проверяйте метаданные и переходите в AI-консультацию в одном интерфейсе."
          action={
            <Button asChild size="sm">
              <Link href="/register">
                Открыть кабинет
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />

        <div className="mt-8 rounded-[1.7rem] border border-border/70 bg-surface/80 p-4">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setQuery(searchValue.trim());
            }}
          >
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Поиск по названию, номеру дела, суду или содержанию"
            />
            <Button type="submit" size="lg">
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
              Найти
            </Button>
          </form>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[280px] w-full" />
              ))}
            </div>
          ) : records.length ? (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                {records.map((record) => (
                  <CaseCard key={record.id} record={record} />
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
              title="По вашему запросу дела не найдены"
              description="Попробуйте более широкий запрос, другой номер дела или уберите часть условий поиска."
            />
          )}
        </div>
      </main>
    </div>
  );
}
