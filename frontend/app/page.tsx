import Link from "next/link";
import {
  ArrowRight,
  Building2,
  DatabaseZap,
  Scale,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PublicHeader } from "@/components/public-header";
import { ArticleCard } from "@/components/article-card";
import { LawyerCard } from "@/components/lawyer-card";
import { SectionHeading } from "@/components/section-heading";
import { SiteDisclaimer } from "@/components/site-disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const sampleLawyers = [
  {
    id: 1,
    name: "Елена Соколова",
    photo_url: "/images/lawyer-placeholder-1.svg",
    specialization: "Корпоративное право",
    description: "Корпоративные споры, конфликты управления и стратегическая оценка юридических рисков.",
    experience_years: 12,
    rating: 4.9,
    contacts: { email: "sokolova@yuristconsultat.ru" },
    consultation_price: 15000,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Илья Романов",
    photo_url: "/images/lawyer-placeholder-2.svg",
    specialization: "Арбитраж и банкротство",
    description: "Коммерческие споры, банкротные стратегии и анализ судебной практики по сложным делам.",
    experience_years: 9,
    rating: 4.8,
    contacts: { email: "romanov@yuristconsultat.ru" },
    consultation_price: 12000,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const sampleArticles = [
  {
    id: 1,
    title: "Как AI ускоряет анализ судебной практики",
    slug: "ai-judicial-research",
    kind: "news",
    excerpt: "Практический обзор того, как юридический AI сокращает часы анализа дел до нескольких минут.",
    content: "",
    cover_image: null,
    is_published: true,
    published_at: new Date().toISOString(),
    author_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Пять сигналов, что спору нужен анализ судебной практики",
    slug: "precedent-analysis-signals",
    kind: "article",
    excerpt: "Паттерны, которые показывают, когда интуиции недостаточно и нужна опора на судебные дела.",
    content: "",
    cover_image: null,
    is_published: true,
    published_at: new Date().toISOString(),
    author_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const features = [
  {
    icon: Sparkles,
    title: "AI-логика для юридического анализа",
    description: "Подключите ваш `ai.py` напрямую к консультационному продукту с готовым пользовательским опытом.",
  },
  {
    icon: SearchCheck,
    title: "Ответы с опорой на судебные дела",
    description: "Помощник ищет похожие кейсы в PostgreSQL, находит практику и формирует юридический вывод.",
  },
  {
    icon: DatabaseZap,
    title: "История консультаций и сохраненные материалы",
    description: "История чатов, избранное и важные дела собраны в одном аккуратном рабочем пространстве.",
  },
];

const stats = [
  { value: "24/7", label: "Доступность поиска" },
  { value: "< 60 сек", label: "Среднее время первого ответа" },
  { value: "1 платформа", label: "Дела, юристы и AI в одном месте" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main>
        <section className="grid-pattern relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge className="border-accent/20 bg-accent/8 text-accent">Legal-tech AI платформа</Badge>
                <h1 className="max-w-4xl font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
                  Судебный поиск, AI-консультации и юридическая работа в одном профессиональном интерфейсе.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  ЮристКонсультат превращает ваш существующий юридический backend в современный сервис с поиском дел,
                  AI-консультациями, аналитикой и подбором юристов.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    Открыть платформу
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/cases">Перейти к делам</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <Card key={item.label} className="p-5">
                    <div className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.label}</div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="relative overflow-hidden p-0">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-accent/18 via-warning/10 to-transparent" />
              <div className="space-y-6 p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Живая консультация</div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">AI-юридический кабинет</div>
                  </div>
                  <Badge>Потоковые ответы</Badge>
                </div>

                <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-surface-elevated p-5">
                  <div className="ml-auto max-w-sm rounded-[1.5rem] bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground">
                    Оцени риски в трудовом споре и найди похожую судебную практику.
                  </div>
                  <div className="max-w-md rounded-[1.5rem] border border-border/70 bg-background px-4 py-3 text-sm leading-6 text-foreground">
                    Я нашел релевантные трудовые дела, выделил схожие обстоятельства и подготовил краткий вывод по рискам.
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-[1.2rem] border border-border/70 bg-background px-4 py-3">
                      <div className="font-medium text-foreground">Дело N А40-12804/2024</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        Спор о неправомерном увольнении с оценкой компенсационных рисков работодателя.
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] border border-border/70 bg-background px-4 py-3">
                      <div className="font-medium text-foreground">Дело N А56-88411/2023</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        Ошибки работодателя в процедуре и вопросы доказывания по внутреннему расследованию.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-border/70 bg-surface-elevated p-4">
                    <Scale className="size-5 text-accent" />
                    <div className="mt-3 text-sm font-semibold text-foreground">База дел</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-border/70 bg-surface-elevated p-4">
                    <Building2 className="size-5 text-accent" />
                    <div className="mt-3 text-sm font-semibold text-foreground">История консультаций</div>
                  </div>
                  <div className="rounded-[1.35rem] border border-border/70 bg-surface-elevated p-4">
                    <ShieldCheck className="size-5 text-accent" />
                    <div className="mt-3 text-sm font-semibold text-foreground">Защищенный доступ</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Ключевые возможности"
            title="Создано для серьезной юридической работы"
            description="Интерфейс остается минималистичным, но каждая деталь настроена под судебный поиск, консультации и управляемость процессов."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading
                eyebrow="Рекомендуемые специалисты"
                title="Проверенные юристы"
                description="Пользователь может перейти от AI-анализа к живой юридической консультации без смены платформы."
              />
              <div className="mt-8 grid gap-5">
                {sampleLawyers.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} compact />
                ))}
              </div>
            </div>

            <div>
              <SectionHeading
                eyebrow="База знаний"
                title="Новости и юридическая аналитика"
                description="Публикуйте экспертные материалы и обновления платформы в едином legal-tech пространстве."
              />
              <div className="mt-8 grid gap-5">
                {sampleArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} compact />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Card className="overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Готово к запуску</div>
                <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Превратите ваш `ai.py` в полноценный продукт.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                  Стек уже подготовлен под Next.js, FastAPI, PostgreSQL, JWT-авторизацию и современный legal-tech интерфейс.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/chat">Открыть AI-чат</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/login">Войти</Link>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
      <footer className="border-t border-border/70">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <SiteDisclaimer />
        </div>
      </footer>
    </div>
  );
}
