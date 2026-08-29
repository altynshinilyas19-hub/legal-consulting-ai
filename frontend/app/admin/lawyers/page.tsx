"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LawyerCard } from "@/components/lawyer-card";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  adminCreateLawyer,
  adminDeleteLawyer,
  adminLawyers,
  adminUpdateLawyer,
} from "@/lib/api";
import type { LawyerRecord } from "@/lib/types";

type LawyerFormState = {
  name: string;
  photo_url: string;
  specialization: string;
  description: string;
  experience_years: string;
  rating: string;
  consultation_price: string;
  email: string;
  phone: string;
  is_active: boolean;
};

const EMPTY_FORM: LawyerFormState = {
  name: "",
  photo_url: "",
  specialization: "",
  description: "",
  experience_years: "1",
  rating: "5",
  consultation_price: "0",
  email: "",
  phone: "",
  is_active: true,
};

export default function AdminLawyersPage() {
  const [items, setItems] = useState<LawyerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<LawyerFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminLawyers();
        setItems(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить список юристов.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.specialization} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const selectLawyer = (lawyer: LawyerRecord | null) => {
    setSelectedId(lawyer?.id ?? null);
    setForm(
      lawyer
        ? {
            name: lawyer.name,
            photo_url: lawyer.photo_url || "",
            specialization: lawyer.specialization,
            description: lawyer.description,
            experience_years: String(lawyer.experience_years),
            rating: String(lawyer.rating),
            consultation_price: String(lawyer.consultation_price),
            email: lawyer.contacts.email || "",
            phone: lawyer.contacts.phone || "",
            is_active: lawyer.is_active,
          }
        : EMPTY_FORM,
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      photo_url: form.photo_url || null,
      specialization: form.specialization,
      description: form.description,
      experience_years: Number(form.experience_years),
      rating: Number(form.rating),
      consultation_price: Number(form.consultation_price),
      contacts: {
        ...(form.email ? { email: form.email } : {}),
        ...(form.phone ? { phone: form.phone } : {}),
      },
      is_active: form.is_active,
    };

    try {
      if (selectedId) {
        const updated = await adminUpdateLawyer(selectedId, payload);
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        selectLawyer(updated);
        toast.success("Профиль юриста обновлён.");
      } else {
        const created = await adminCreateLawyer(payload);
        setItems((current) => [created, ...current]);
        selectLawyer(created);
        toast.success("Профиль юриста создан.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить профиль юриста.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("Удалить этот профиль юриста?")) {
      return;
    }
    try {
      await adminDeleteLawyer(selectedId);
      setItems((current) => current.filter((item) => item.id !== selectedId));
      selectLawyer(null);
      toast.success("Профиль юриста удалён.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить профиль юриста.");
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Юристы"
        title="Управление профилями экспертов"
        description="Создавайте, редактируйте, публикуйте и удаляйте профили юристов, используемые в клиентском интерфейсе."
        action={
          <Button variant="secondary" size="sm" onClick={() => selectLawyer(null)}>
            Новый профиль
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск юристов"
          />
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)
            ) : (
              filtered.map((lawyer) => (
                <button
                  key={lawyer.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => selectLawyer(lawyer)}
                >
                  <LawyerCard lawyer={lawyer} compact showAction={false} showFavorite={false} />
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
                  {selectedId ? "Редактирование юриста" : "Создание профиля юриста"}
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
                <label className="text-sm font-medium text-foreground">Имя</label>
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Специализация</label>
                <Input
                  value={form.specialization}
                  onChange={(event) => setForm({ ...form, specialization: event.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ссылка на фотографию</label>
              <Input
                value={form.photo_url}
                onChange={(event) => setForm({ ...form, photo_url: event.target.value })}
                placeholder="/images/lawyer-placeholder-1.svg"
              />
              <p className="text-xs leading-6 text-muted-foreground">
                РСЃРїРѕР»СЊР·СѓР№С‚Рµ Р»РѕРєР°Р»СЊРЅС‹Рµ С„Р°Р№Р»С‹ РёР· `public/images`.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Описание</label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Опыт, лет</label>
                <Input
                  type="number"
                  min="0"
                  value={form.experience_years}
                  onChange={(event) => setForm({ ...form, experience_years: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Рейтинг</label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={form.rating}
                  onChange={(event) => setForm({ ...form, rating: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Стоимость консультации</label>
                <Input
                  type="number"
                  min="0"
                  value={form.consultation_price}
                  onChange={(event) => setForm({ ...form, consultation_price: event.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Электронная почта</label>
                <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Телефон</label>
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Профиль активен
            </label>

            <Button disabled={saving}>{selectedId ? "Сохранить изменения" : "Создать профиль"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
