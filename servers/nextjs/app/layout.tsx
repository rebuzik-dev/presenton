import type { Metadata } from "next";
import localFont from "next/font/local";
import { Roboto, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import MixpanelInitializer from "./MixpanelInitializer";
import { Toaster } from "@/components/ui/sonner";
const inter = localFont({
  src: [
    {
      path: "./fonts/Inter.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-inter",
});

const instrument_sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-sans",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-roboto",
});


export const metadata: Metadata = {
  metadataBase: new URL("https://presenton.ai"),
  title: "Presenton - Open Source AI presentation generator",
  description:
    "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
  keywords: [
    "AI presentation generator",
    "data storytelling",
    "data visualization tool",
    "AI data presentation",
    "presentation generator",
    "data to presentation",
    "interactive presentations",
    "professional slides",
  ],
  openGraph: {
    title: "Presenton - Open Source AI presentation generator",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    url: "https://presenton.ai",
    siteName: "Presenton",
    images: [
      {
        url: "https://presenton.ai/presenton-feature-graphics.png",
        width: 1200,
        height: 630,
        alt: "Presenton Logo",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: "https://presenton.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "Presenton - Open Source AI presentation generator",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    images: ["https://presenton.ai/presenton-feature-graphics.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${roboto.variable} ${instrument_sans.variable} antialiased`}
      >
        <Providers>
          <MixpanelInitializer>
            {children}
          </MixpanelInitializer>
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
