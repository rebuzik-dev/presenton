# Формат Шаблонов Presenton

Это руководство описывает формат создания кастомных шаблонов для презентаций.

## Структура файла слайд-лейаута (.tsx)

Каждый слайд-лейаут — это TSX файл с обязательными экспортами:

```typescript
import React from 'react'
import * as z from "zod"

// === МЕТАДАННЫЕ (обязательные экспорты) ===

// Уникальный ID лейаута (kebab-case)
export const layoutId = 'my-custom-slide'

// Человекочитаемое название
export const layoutName = 'My Custom Slide'

// Описание для LLM (когда использовать этот лейаут)
export const layoutDescription = 'A slide layout for displaying custom content with image and text.'

// === СХЕМА ДАННЫХ (обязательный экспорт) ===

export const Schema = z.object({
    title: z.string()
        .min(3).max(50)
        .default('Default Title')
        .meta({ description: "Заголовок слайда" }),
    
    description: z.string()
        .min(10).max(200)
        .default('Default description text')
        .meta({ description: "Описательный текст" }),
    
    // Для изображений используйте ImageSchema:
    image: z.object({
        __image_url__: z.url().meta({ description: "URL изображения" }),
        __image_prompt__: z.string().min(10).max(50)
            .meta({ description: "Промпт для генерации изображения" }),
    }).default({
        __image_url__: 'https://example.com/default.jpg',
        __image_prompt__: 'Professional business meeting'
    }),
    
    // Для иконок используйте IconSchema:
    icon: z.object({
        __icon_url__: z.string().meta({ description: "URL иконки" }),
        __icon_query__: z.string().min(5).max(20)
            .meta({ description: "Поисковый запрос для иконки" }),
    }).optional(),
    
    // Массивы элементов
    items: z.array(z.object({
        title: z.string(),
        text: z.string(),
    })).default([]),
})

// Тип данных для TypeScript
export type MySlideData = z.infer<typeof Schema>

// === КОМПОНЕНТ (default export) ===

interface Props {
    data?: Partial<MySlideData>
}

const MyCustomSlideLayout: React.FC<Props> = ({ data: slideData }) => {
    return (
        <div 
            className="w-full max-w-[1280px] max-h-[720px] aspect-video bg-white relative mx-auto overflow-hidden"
            style={{
                fontFamily: 'var(--heading-font-family, Inter)',
                background: 'var(--card-background-color, #ffffff)'
            }}
        >
            {/* Заголовок */}
            <h1 
                style={{ color: 'var(--text-heading-color, #111827)' }}
                className="text-5xl font-bold"
            >
                {slideData?.title || 'Default Title'}
            </h1>
            
            {/* Описание */}
            <p 
                style={{ color: 'var(--text-body-color, #4b5563)' }}
                className="text-lg"
            >
                {slideData?.description || 'Default description'}
            </p>
            
            {/* Изображение */}
            {slideData?.image?.__image_url__ && (
                <img 
                    src={slideData.image.__image_url__} 
                    alt={slideData.image.__image_prompt__}
                    className="w-full h-auto object-cover"
                />
            )}
        </div>
    )
}

export default MyCustomSlideLayout
```

## CSS Переменные для тем

Используйте CSS переменные для поддержки кастомных тем:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `--heading-font-family` | Шрифт заголовков | Inter |
| `--body-font-family` | Шрифт текста | Inter |
| `--text-heading-color` | Цвет заголовков | #111827 |
| `--text-body-color` | Цвет текста | #4b5563 |
| `--card-background-color` | Фон слайда | #ffffff |
| `--accent-color` | Акцентный цвет | #9333ea |

## Типы полей в схеме

### Текстовые поля
```typescript
title: z.string().min(3).max(50).default('Title').meta({
    description: "Описание для LLM"
})
```

### Изображения
```typescript
image: z.object({
    __image_url__: z.url(),
    __image_prompt__: z.string().min(10).max(50),
})
```

### Иконки
```typescript
icon: z.object({
    __icon_url__: z.string(),
    __icon_query__: z.string().min(5).max(20),
})
```

### Массивы
```typescript
items: z.array(z.object({
    title: z.string(),
    value: z.number(),
})).min(2).max(6).default([])
```

## Структура шаблона

```
presentation-templates/
├── my-template/
│   ├── settings.json         # Настройки шаблона
│   ├── TitleSlideLayout.tsx
│   ├── ContentSlideLayout.tsx
│   └── EndSlideLayout.tsx
```

### settings.json
```json
{
    "description": "Описание шаблона для пользователей",
    "ordered": false,
    "default": false
}
```

- `ordered: true` — LLM использует лейауты последовательно (Strict Mode)
- `ordered: false` — LLM выбирает лучший лейаут для каждого слайда (Smart Mode)

## Загрузка через API

### POST `/api/v1/ppt/templates/`
```json
{
    "name": "My Template",
    "slug": "my-template",
    "description": "Custom template description",
    "ordered": false,
    "layouts": [
        {
            "name": "TitleSlide",
            "file": "TitleSlideLayout.tsx",
            "description": "Title slide",
            "json_schema": { ... }
        }
    ]
}
```

## Примеры готовых лейаутов

Смотрите примеры в:
- `presentation-templates/general/` — базовые универсальные лейауты
- `presentation-templates/modern/` — современный стиль pitch-deck
- `presentation-templates/standard/` — стандартный бизнес-стиль
