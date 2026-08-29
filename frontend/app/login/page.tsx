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

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await signIn({ email, password });
      toast.success("С возвращением.");
      router.push(response.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось выполнить вход.");
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
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Вход</div>
            <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground">
              Вернитесь в рабочее пространство юридического AI.
            </h1>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Получите доступ к сохраненным консультациям, избранному и AI-помощнику из одного защищенного аккаунта.
            </p>
          </div>

          <Card>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Доступ к аккаунту</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">С возвращением</h2>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Пароль</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Введите пароль"
                  required
                />
              </div>

              <Button className="w-full" size="lg" disabled={submitting}>
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Войти
              </Button>

              <p className="text-sm text-muted-foreground">
                Еще нет аккаунта?{" "}
                <Link href="/register" className="font-medium text-accent">
                  Зарегистрироваться
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
