# API Guide: Вызов Ручек (Templates + Generate)

Дата обновления: 27 февраля 2026

Этот документ фиксирует актуальный способ работы с кастомными шаблонами и автогенерацией через API.

## 1. Аутентификация

Все ` /api/v1/ppt/* ` ручки защищены.

Используйте один из вариантов:
- `Authorization: Bearer <JWT>`
- `X-API-Key: <API_KEY>`

### Login (JWT)
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

## 2. Кастомные шаблоны (Template Management)

### 2.1 Получить список кастомных шаблонов
```bash
curl "http://localhost:8000/api/v1/ppt/template-management/summary" \
  -H "Authorization: Bearer <JWT>"
```

В ответе для каждого шаблона приходит:
- `presentation_id` (UUID шаблона)
- `template.name`
- `template.description`
- `template.slug` (актуальный slug для вызова в `/generate`)

### 2.2 Получить layouts конкретного шаблона
```bash
curl "http://localhost:8000/api/v1/ppt/template-management/get-templates/<presentation_id>" \
  -H "Authorization: Bearer <JWT>"
```

### 2.3 Обновить метаданные шаблона (name/description/slug)
Ручка работает как upsert по `id`.

```bash
curl -X POST "http://localhost:8000/api/v1/ppt/template-management/templates" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "8a9a46cd-bb1f-4513-b814-41d927eb92da",
    "name": "Sales Deck v2",
    "description": "Шаблон для sales-питча",
    "slug": "sales-deck-v2"
  }'
```

Ограничения slug:
- только `a-z`, `0-9`, `-`
- max 120 символов
- уникален в таблице `templates`

### 2.4 Сохранить/обновить layout-код шаблона
```bash
curl -X POST "http://localhost:8000/api/v1/ppt/template-management/save-templates" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "layouts": [
      {
        "presentation": "8a9a46cd-bb1f-4513-b814-41d927eb92da",
        "layout_id": "1",
        "layout_name": "Slide1",
        "layout_code": "export default function dynamicSlideLayout(){ return <div/> }",
        "fonts": []
      }
    ]
  }'
```

### 2.5 Удалить шаблон
```bash
curl -X DELETE "http://localhost:8000/api/v1/ppt/template-management/delete-templates/<template_uuid>" \
  -H "Authorization: Bearer <JWT>"
```

## 3. Автогенерация презентации

### 3.1 Запуск генерации (рекомендуется по slug)
```bash
curl -X POST "http://localhost:8000/api/v1/ppt/presentation/generate" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Сделай презентацию по стратегии продаж на 2026",
    "n_slides": 8,
    "language": "Russian",
    "template": "sales-deck-v2"
  }'
```

### 3.2 Проверка статуса
```bash
curl "http://localhost:8000/api/v1/ppt/presentation/status/<presentation_id>" \
  -H "Authorization: Bearer <JWT>"
```

Важные статусы:
- `pending` — задача создана;
- `processing` — генерация в процессе;
- `completed` — генерация завершена;
- `error` — ошибка (подробности в `error`).

### 3.3 Полный Flow: Generate -> Status -> Export -> Download

`POST /api/v1/ppt/presentation/generate` запускает background-задачу и возвращает `presentation_id`.
Файл `pdf/pptx` нужно запрашивать отдельным вызовом `POST /api/v1/ppt/presentation/export` после `status=completed`.

Пример типичного ответа статуса:
```json
{
  "id": "c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f",
  "status": "completed",
  "message": "Presentation generation completed",
  "presentation_id": "c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f",
  "error": null,
  "data": {
    "presentation_id": "c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f",
    "path": null,
    "edit_path": "/presentation?id=c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f"
  }
}
```

Экспорт конкретной презентации в PDF:
```bash
curl -X POST "http://localhost:8000/api/v1/ppt/presentation/export" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<presentation_id>",
    "export_as": "pdf"
  }'
```

Экспорт конкретной презентации в PPTX:
```bash
curl -X POST "http://localhost:8000/api/v1/ppt/presentation/export" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<presentation_id>",
    "export_as": "pptx"
  }'
```

Пример ответа export:
```json
{
  "presentation_id": "c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f",
  "path": "/app_data/exports/Sales Deck v2.pdf",
  "edit_path": "/presentation?id=c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f"
}
```

Скачивание файла (если `path` начинается с `/app_data/...`):
```bash
curl -L "http://localhost:8000/app_data/exports/Sales%20Deck%20v2.pdf" -o "Sales Deck v2.pdf"
curl -L "http://localhost:8000/app_data/exports/Sales%20Deck%20v2.pptx" -o "Sales Deck v2.pptx"
```

Примечание:
- В текущем flow `export_as` в `POST /api/v1/ppt/presentation/generate` не возвращает готовый файл автоматически.
- Для получения бинарника всегда выполняйте отдельный `POST /api/v1/ppt/presentation/export` после `status=completed`.

### 3.4 Передача своей структуры слайдов + image guidance
`/presentation/generate` поддерживает `slides_markdown` в двух форматах:
- legacy: список строк;
- новый: список объектов с полями `content`, `image_prompt`, `reference_image_source`, `style`.

Также доступен глобальный reference:
- `global_reference_image_source` (применяется ко всем слайдам без slide-level override).

Пример:
```bash
curl -X POST "http://localhost:8000/api/v1/ppt/presentation/generate" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Презентация компании",
    "template": "general",
    "language": "Russian",
    "slides_markdown": [
      {
        "content": "## О нас\n- Рост x3",
        "image_prompt": "Современный стеклянный офис, дневной свет",
        "reference_image_source": "https://example.com/slide-ref.png",
        "style": {
          "slide": {
            "colors": {
              "background": "#FFFFFF",
              "text_primary": "#3F3F3F",
              "surface": "#E6E6E6",
              "accent": "#1A1C23"
            },
            "fonts": {
              "display": "Manrope",
              "heading": "Manrope",
              "body": "Inter"
            }
          },
          "blocks": {
            "title": { "color": "#3F3F3F", "font": "display" },
            "body": { "font": "body" },
            "bullet_marker": { "background": "#1A1C23" }
          }
        }
      },
      "## Команда\n- CEO\n- CTO"
    ],
    "global_reference_image_source": "https://example.com/global-style.png"
  }'
```

Детальный контракт: `docs/AUTOGENERATE_CUSTOM_STRUCTURE.md`.

Важно для multi-container setup:
- Не передавайте локальные пути как references, если файл не примонтирован в backend-контейнер.
- Предпочитайте `http(s)` URL.
- Base64 передавайте только в Data URL формате: `data:image/png;base64,...`.

### 3.5 Получить summary по изображениям для шаблона (для внешнего сервиса)
```bash
curl "http://localhost:8000/api/v1/ppt/templates/general/image-summary" \
  -H "Authorization: Bearer <JWT>"
```

Пример ответа:
```json
{
  "template": "general",
  "ordered": false,
  "total_image_prompt_slots": 12,
  "slides": [
    {
      "index": 0,
      "layout_id": "intro-slide",
      "layout_name": "Intro Slide",
      "schema_title": "Intro Slide",
      "slide_description": "Slide intro layout... | Schema: Intro Slide | Fields: title, description, image",
      "image_prompt_slots": 1,
      "image_prompts": ["Corporate office lobby photo"],
      "count_is_approximate": false
    }
  ]
}
```

Подсчет:
- учитываются только image-slots по `__image_prompt__`;
- `image_prompts` содержит prompt'ы изображений из schema; если defaults в schema отсутствуют, используется fallback-парсинг из исходного layout `.tsx`;
- иконки (`__icon_query__`) игнорируются;
- для массивов используется `maxItems` (или `minItems`, если `maxItems` нет).

### 3.6 Получить style-summary шаблона (block IDs + style tokens)
```bash
curl "http://localhost:8000/api/v1/ppt/templates/catering/style-summary" \
  -H "Authorization: Bearer <JWT>"
```

Ручка возвращает:
- список `block_ids`, которые реально используются в TSX-лейаутах шаблона;
- `slide_color_tokens` и `slide_font_tokens`;
- детализацию по каждому layout-файлу (`color_bindings`, `font_bindings`).

Это удобно для внешнего конструктора payload `slides_markdown[].style`.

### 3.7 Получить schema-summary шаблона (контентные поля и ограничения)
```bash
curl "http://localhost:8000/api/v1/ppt/templates/catering/schema-summary" \
  -H "Authorization: Bearer <JWT>"
```

Ручка возвращает по каждому layout:
- `layout_id`, `layout_name`, `layout_description`, `source_file`
- `json_schema` (полная схема layout)
- `fields_summary` (плоский список полей с `path`, `type`, `required`, `constraints`, `enum_values`, `special_kind`)
- `content_slots` (включая `image_slots`, `icon_slots`, `array_slots`)
- `render_hints.visible_items_from_schema` (generic hints из `minItems/maxItems`)

Важно:
- Для задачи бриф-формы и валидации контентных данных используйте именно `schema-summary`.
- `style-summary` покрывает только style tokens и block bindings.

## 4. Что передавать в поле `template`

Поддерживаются оба варианта:
- новый: `template = "<slug>"` (рекомендуется)
- legacy: `template = "custom-<uuid>"`

Текущая логика резолва:
1. Поиск по `templates.slug`
2. Legacy fallback для `custom-<uuid>`
3. Для legacy custom layouts используется совместимый bridge в schema-резолве

## 5. Важно про URL в UI

Страница preview может открываться как:
- `http://localhost:3000/template-preview/custom-<uuid>`

Это внутренний route UI. Он не обязан совпадать со slug для API.

Для `POST /api/v1/ppt/presentation/generate` используйте именно `template.slug`.

## 6. Новый реестр templates (дополнительно)

Доступен также отдельный templates API:
- `GET /api/v1/ppt/templates`
- `GET /api/v1/ppt/templates/{slug}`
- `POST /api/v1/ppt/templates`
- `PUT /api/v1/ppt/templates/{template_id}`
- `DELETE /api/v1/ppt/templates/{template_id}`
- `GET /api/v1/ppt/templates/{slug}/style-summary`
- `GET /api/v1/ppt/templates/{slug}/schema-summary`

Он используется как общий реестр, но в текущем UI custom-template поток все еще использует `template-management/*`.
