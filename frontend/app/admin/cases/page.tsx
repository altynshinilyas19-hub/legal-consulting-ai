"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CaseCard } from "@/components/case-card";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCases,
  adminCreateCase,
  adminDeleteCase,
  adminUpdateCase,
  adminUploadCase,
} from "@/lib/api";
import type { CaseRecord } from "@/lib/types";

type CaseFormState = {
  file_name: string;
  title: string;
  case_number: string;
  court_name: string;
  category: string;
  region: string;
  source_url: string;
  excerpt: string;
  content: string;
  decision_date: string;
  case_metadata: string;
};

const EMPTY_FORM: CaseFormState = {
  file_name: "",
  title: "",
  case_number: "",
  court_name: "",
  category: "",
  region: "",
  source_url: "",
  excerpt: "",
  content: "",
  decision_date: "",
  case_metadata: "{}",
};

export default function AdminCasesPage() {
  const [items, setItems] = useState<CaseRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<CaseFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadCases = async (value = query) => {
    setLoading(true);
    try {
      const data = await adminCases(value);
      setItems(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить список дел.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCases("");
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.file_name} ${item.title || ""} ${item.content}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const selectCase = (record: CaseRecord | null) => {
    setSelectedId(record?.id ?? null);
    setForm(
      record
        ? {
            file_name: record.file_name,
            title: record.title || "",
            case_number: record.case_number || "",
            court_name: record.court_name || "",
            category: record.category || "",
            region: record.region || "",
            source_url: record.source_url || "",
            excerpt: record.excerpt || "",
            content: record.content,
            decision_date: record.decision_date || "",
            case_metadata: JSON.stringify(record.case_metadata || {}, null, 2),
          }
        : EMPTY_FORM,
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    let parsedMetadata: Record<string, unknown> = {};
    try {
      parsedMetadata = JSON.parse(form.case_metadata || "{}");
    } catch {
      toast.error("Поле метаданных должно содержать корректный JSON.");
      setSaving(false);
      return;
    }

    const payload = {
      file_name: form.file_name,
      title: form.title || null,
      case_number: form.case_number || null,
      court_name: form.court_name || null,
      category: form.category || null,
      region: form.region || null,
      source_url: form.source_url || null,
      excerpt: form.excerpt || null,
      content: form.content,
      decision_date: form.decision_date || null,
      case_metadata: parsedMetadata,
    };

    try {
      if (selectedId) {
        const updated = await adminUpdateCase(selectedId, payload);
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        selectCase(updated);
        toast.success("Дело обновлено.");
      } else {
        const created = await adminCreateCase(payload);
        setItems((current) => [created, ...current]);
        selectCase(created);
        toast.success("Дело создано.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить дело.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("Удалить это дело?")) {
      return;
    }
    try {
      await adminDeleteCase(selectedId);
      setItems((current) => current.filter((item) => item.id !== selectedId));
      selectCase(null);
      toast.success("Дело удалено.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить дело.");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const created = await adminUploadCase(file);
      setItems((current) => [created, ...current]);
      selectCase(created);
      toast.success("Файл дела загружен.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить файл дела.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Дела"
        title="Управление судебной базой"
        description="Загружайте новые дела, уточняйте метаданные и поддерживайте корпус решений в актуальном состоянии для AI-анализа."
        action={
          <div className="flex gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-elevated">
              {uploading ? "Загрузка..." : "Загрузить файл"}
              <input type="file" className="hidden" onChange={(event) => void handleUpload(event)} />
            </label>
            <Button variant="secondary" size="sm" onClick={() => selectCase(null)}>
              Новое дело
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск судебных дел"
          />
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)
            ) : (
              filtered.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => selectCase(record)}
                >
                  <CaseCard record={record} compact showAction={false} showFavorite={false} />
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
                  {selectedId ? "Редактирование дела" : "Создание дела"}
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
                <label className="text-sm font-medium text-foreground">Имя файла</label>
                <Input value={form.file_name} onChange={(event) => setForm({ ...form, file_name: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Заголовок</label>
                <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Номер дела</label>
                <Input value={form.case_number} onChange={(event) => setForm({ ...form, case_number: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Суд</label>
                <Input value={form.court_name} onChange={(event) => setForm({ ...form, court_name: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Категория</label>
                <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Регион</label>
                <Input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Дата решения</label>
                <Input
                  type="date"
                  value={form.decision_date}
                  onChange={(event) => setForm({ ...form, decision_date: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">URL источника</label>
              <Input value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Краткое описание</label>
              <Textarea value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Полный текст</label>
              <Textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                className="min-h-[220px]"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Метаданные JSON</label>
              <Textarea
                value={form.case_metadata}
                onChange={(event) => setForm({ ...form, case_metadata: event.target.value })}
                className="min-h-[180px] font-mono text-xs"
              />
            </div>

            <Button disabled={saving}>{selectedId ? "Сохранить изменения" : "Создать дело"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
