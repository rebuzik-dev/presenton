import React from "react";

import UploadPage from "./components/UploadPage";
import Header from "@/app/(presentation-generator)/dashboard/components/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presenton | Модуль генерации презентаций",
  description:
    "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
  alternates: {
    canonical: "https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai/create",
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
    title: "Presenton | Модуль генерации презентаций",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    type: "website",
    url: "https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai/create",
    siteName: "Presenton",
    images: [
      {
        url: "https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai/Logo.png",
        width: 512,
        height: 512,
        alt: "Presenton Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Presenton | Модуль генерации презентаций",
    description:
      "Модуль генерации презентаций в экосистеме Креатив-конфигуратор. Интеллектуальная платформа для создания презентаций по брифу: кастомные шаблоны, автоматическая сборка структуры, поддержка разных ИИ-движков и экспорт в PDF/PPTX.",
    site: "@presenton_ai",
    creator: "@presenton_ai",
    images: ["https://xn--80ajahh2akiw5b9f.xn----7sbbggiwcmf7aleqkcwkqr.xn--p1ai/Logo.png"],
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
