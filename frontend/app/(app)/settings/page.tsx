"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { updateMe } from "@/lib/api";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || "");
    setAvatarUrl(user?.avatar_url || "");
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateMe({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refreshUser();
      toast.success("Профиль обновлен.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить настройки.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Настройки аккаунта"
        title="Профиль и данные рабочего кабинета"
        description="Обновите данные, которые используются в AI-чате, панели управления и административных записях."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Имя и фамилия</label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ссылка на аватар</label>
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button disabled={saving}>
              <Save className="size-4" />
              Сохранить изменения
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Статус кабинета</div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{user?.email}</div>
          <p className="text-sm leading-7 text-muted-foreground">
            Сессии на JWT поддерживаются через токен обновления. История консультаций остается привязанной к вашему аккаунту.
          </p>
        </Card>
      </div>
    </div>
  );
}
