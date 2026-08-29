"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { AuthProvider } from "@/components/auth-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
