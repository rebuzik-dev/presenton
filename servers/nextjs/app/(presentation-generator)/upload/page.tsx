import React from "react";

import UploadPage from "./components/UploadPage";
import Header from "@/app/(presentation-generator)/dashboard/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presenton | Open Source AI presentation generator",
  description:
    "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
  alternates: {
    canonical: "https://presenton.ai/create",
  },
  keywords: [
    "presentation generator",
    "AI presentations",
    "data visualization",
    "automatic presentation maker",
    "professional slides",
    "data-driven presentations",
    "document to presentation",
    "presentation automation",
    "smart presentation tool",
    "business presentations",
  ],
  openGraph: {
    title: "Create Data Presentation | PresentOn",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    type: "website",
    url: "https://presenton.ai/create",
    siteName: "PresentOn",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Data Presentation | PresentOn",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    site: "@presenton_ai",
    creator: "@presenton_ai",
  },
};

const page = () => {
  return (
    <div className="relative">
      <Header />
      <div className="flex flex-col items-center justify-center  py-8">
        <h1 className="text-3xl font-semibold font-instrument_sans">
          Create Presentation{" "}
        </h1>
        {/* <p className='text-sm text-gray-500'>We will generate a presentation for you</p> */}
      </div>

      <UploadPage />
    </div>
  );
};

export default page;
