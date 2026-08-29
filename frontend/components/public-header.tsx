import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/cases" className="transition hover:text-foreground">
            Дела
          </Link>
          <Link href="/lawyers" className="transition hover:text-foreground">
            Юристы
          </Link>
          <Link href="/login" className="transition hover:text-foreground">
            Вход
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/register">Начать</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
