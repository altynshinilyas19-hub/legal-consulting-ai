import Link from "next/link";

import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto flex min-h-[calc(100vh-89px)] max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full text-center">
          <div className="space-y-5">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">404</div>
            <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground">
              Такая страница не найдена
            </h1>
            <p className="mx-auto max-w-xl text-base leading-8 text-muted-foreground">
              Запрошенный маршрут не существует или больше недоступен в текущем рабочем пространстве.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/">На главную</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/chat">Открыть AI-чат</Link>
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
