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
  metadataBase: new URL("https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai"),
  title: "Presenton - Модуль генерации презентаций",
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
    title: "Presenton - Модуль генерации презентаций",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    url: "https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai",
    siteName: "Presenton",
    images: [
      {
        url: "https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai/Logo.png",
        width: 512,
        height: 512,
        alt: "Presenton Logo",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: "https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "Presenton - Модуль генерации презентаций",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    images: ["https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai/Logo.png"],
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
