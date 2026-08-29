"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

export function ThemeToggle() {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <Button variant="secondary" size="sm">Тема</Button>;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
      {isDark ? "Светлая" : "Темная"}
    </Button>
  );
}
