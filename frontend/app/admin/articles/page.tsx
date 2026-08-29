"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ArticleCard } from "@/components/article-card";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  adminArticles,
  adminCreateArticle,
  adminDeleteArticle,
  adminUpdateArticle,
} from "@/lib/api";
import type { ArticleRecord } from "@/lib/types";

type ArticleFormState = {
  title: string;
  slug: string;
  kind: string;
  excerpt: string;
  content: string;
  cover_image: string;
  is_published: boolean;
};

const EMPTY_FORM: ArticleFormState = {
  title: "",
  slug: "",
  kind: "article",
  excerpt: "",
  content: "",
  cover_image: "",
  is_published: true,
};

export default function AdminArticlesPage() {
  const [items, setItems] = useState<ArticleRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminArticles();
        setItems(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить список материалов.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.title} ${item.kind} ${item.content}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const selectArticle = (article: ArticleRecord | null) => {
    setSelectedId(article?.id ?? null);
    setForm(
      article
        ? {
            title: article.title,
            slug: article.slug,
            kind: article.kind,
            excerpt: article.excerpt || "",
            content: article.content,
            cover_image: article.cover_image || "",
            is_published: article.is_published,
          }
        : EMPTY_FORM,
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      slug: form.slug,
      kind: form.kind,
      excerpt: form.excerpt || null,
      content: form.content,
      cover_image: form.cover_image || null,
      is_published: form.is_published,
    };

    try {
      if (selectedId) {
        const updated = await adminUpdateArticle(selectedId, payload);
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        selectArticle(updated);
        toast.success("Материал обновлён.");
      } else {
        const created = await adminCreateArticle(payload);
        setItems((current) => [created, ...current]);
        selectArticle(created);
        toast.success("Материал создан.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить материал.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("Удалить этот материал?")) {
      return;
    }
    try {
      await adminDeleteArticle(selectedId);
      setItems((current) => current.filter((item) => item.id !== selectedId));
      selectArticle(null);
      toast.success("Материал удалён.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить материал.");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Статьи"
        title="Управление контентом"
        description="Публикуйте статьи, новости и аналитические материалы в единой legal-tech платформе."
        action={
          <Button variant="secondary" size="sm" onClick={() => selectArticle(null)}>
            Новый материал
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск материалов"
          />
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-48 w-full" />)
            ) : (
              filtered.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => selectArticle(article)}
                >
                  <ArticleCard article={article} compact showFavorite={false} />
                </button>
              ))
            )}
          </div>
        </Card>

        <Card>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Редактор</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {selectedId ? "Редактирование материала" : "Создание материала"}
                </div>
              </div>
              {selectedId ? (
                <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete()}>
                  Удалить
                </Button>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Заголовок</label>
                <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Slug</label>
                <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Тип материала</label>
                <Input value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">URL обложки</label>
                <Input
                  value={form.cover_image}
                  onChange={(event) => setForm({ ...form, cover_image: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Краткое описание</label>
              <Textarea value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Содержимое</label>
              <Textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                className="min-h-[220px]"
                required
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => setForm({ ...form, is_published: event.target.checked })}
              />
              Опубликовать сразу
            </label>

            <Button disabled={saving}>{selectedId ? "Сохранить изменения" : "Создать материал"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
