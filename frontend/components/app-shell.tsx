"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpenText,
  BriefcaseBusiness,
  FolderHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { SiteDisclaimer } from "@/components/site-disclaimer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";

type ShellMode = "app" | "admin";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const APP_NAVIGATION: NavItem[] = [
  { href: "/dashboard", label: "Панель управления", icon: LayoutDashboard },
  { href: "/chat", label: "AI-чат", icon: Sparkles },
  { href: "/cases", label: "Судебные дела", icon: Scale },
  { href: "/lawyers", label: "Юристы", icon: BriefcaseBusiness },
  { href: "/favorites", label: "Избранное", icon: FolderHeart },
  { href: "/settings", label: "Настройки", icon: Settings },
];

const ADMIN_NAVIGATION: NavItem[] = [
  { href: "/admin", label: "Обзор", icon: Shield },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/lawyers", label: "Юристы", icon: BriefcaseBusiness },
  { href: "/admin/articles", label: "Статьи", icon: BookOpenText },
  { href: "/admin/cases", label: "Дела", icon: Scale },
  { href: "/admin/logs", label: "AI-логи", icon: Sparkles },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href || pathname.startsWith("/admin/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationItem({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
        active
          ? "bg-accent text-accent-foreground shadow-panel"
          : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  mode = "app",
}: {
  children: ReactNode;
  mode?: ShellMode;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const links = mode === "admin" ? ADMIN_NAVIGATION : APP_NAVIGATION;
  const activeLink = useMemo(
    () => links.find((item) => isPathActive(pathname, item.href)),
    [links, pathname],
  );

  const pageTitle = activeLink?.label ?? (mode === "admin" ? "Админ-панель" : "Панель управления");
  const pageDescription =
    mode === "admin"
      ? "Управление пользователями, контентом и AI-активностью."
      : "Консультации, судебные дела и рабочие материалы в одном месте.";
  const roleLabel =
    mode === "admin"
      ? "Администратор"
      : "Личный кабинет";

  const closeMenu = () => setOpen(false);

  return (
    <div className="legal-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition lg:hidden",
            open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={closeMenu}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-border/70 bg-background/94 px-4 py-4 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between gap-3 px-2">
            <Logo />
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={closeMenu}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-surface/75 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-accent/12 text-sm font-semibold text-accent">
                {user ? initials(user.full_name || user.email) : "AI"}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  {user?.full_name || user?.email || "Гостевой пользователь"}
                </div>
                <div className="truncate text-sm text-muted-foreground">{roleLabel}</div>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
            {links.map((item) => (
              <NavigationItem
                key={item.href}
                item={item}
                active={isPathActive(pathname, item.href)}
                onClick={closeMenu}
              />
            ))}
          </nav>

          <div className="space-y-3 border-t border-border/70 pt-4">
            <div className="[&>button]:w-full [&>button]:justify-start">
              <ThemeToggle />
            </div>
            <Button variant="secondary" className="w-full justify-start" onClick={() => void signOut()}>
              <LogOut className="size-4" />
              Выйти
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/78 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
                  <Menu className="size-4" />
                </Button>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {mode === "admin" ? "Платформа" : "Рабочее пространство"}
                  </div>
                  <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="hidden max-w-md text-right text-sm leading-6 text-muted-foreground xl:block">
                {pageDescription}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 xl:px-10 xl:py-8">{children}</main>
          <footer className="border-t border-border/70 px-4 py-4 sm:px-6 xl:px-10">
            <SiteDisclaimer />
          </footer>
        </div>
      </div>
    </div>
  );
}
