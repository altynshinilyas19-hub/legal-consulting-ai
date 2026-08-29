"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { PublicHeader } from "@/components/public-header";
import { useAuth } from "@/components/auth-provider";
import { SiteDisclaimer } from "@/components/site-disclaimer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await signUp({ email, password, full_name: fullName || undefined });
      toast.success("Аккаунт создан.");
      router.push(response.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать аккаунт.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto flex min-h-[calc(100vh-89px)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Регистрация</div>
            <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground">
              Создайте защищенный аккаунт для юридического AI.
            </h1>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Начинайте консультации, сохраняйте релевантные дела, работайте с избранным и выстраивайте полный legal-tech процесс внутри одной платформы.
            </p>
          </div>

          <Card>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Новый кабинет</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Откройте аккаунт</h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Имя и фамилия</label>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ваше имя"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Электронная почта</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Пароль</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Придумайте пароль"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Повторите пароль</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Повторите пароль"
                    required
                  />
                </div>
              </div>

              <Button className="w-full" size="lg" disabled={submitting}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Создать аккаунт
              </Button>

              <p className="text-sm text-muted-foreground">
                Уже зарегистрированы?{" "}
                <Link href="/login" className="font-medium text-accent">
                  Войти
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </main>
      <footer className="border-t border-border/70">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <SiteDisclaimer />
        </div>
      </footer>
    </div>
  );
}
