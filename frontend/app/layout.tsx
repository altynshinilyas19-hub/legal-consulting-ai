import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "ЮристКонсультат",
  description: "ЮристКонсультат: AI-помощник для поиска судебной практики, консультаций и анализа дел.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
