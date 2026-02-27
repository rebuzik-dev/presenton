# Autogeneration: Custom Structure + Smart Image Guidance

Дата обновления: 27 февраля 2026

Документ описывает новый контракт `POST /api/v1/ppt/presentation/generate` для передачи пользовательской структуры слайдов, image-guidance и image references.

## 1. Endpoint

`POST /api/v1/ppt/presentation/generate`

Аутентификация:
- `Authorization: Bearer <JWT>`
- или `X-API-Key: <API_KEY>`

## 2. Новые поля запроса

### `slides_markdown`
Опциональный список слайдов.

Поддерживаемые форматы элементов:
1. Legacy:
```json
"## Заголовок\n- Пункт 1\n- Пункт 2"
```

2. Новый объект:
```json
{
  "content": "## Заголовок\n- Пункт 1\n- Пункт 2",
  "image_prompt": "Подсказка для генерации изображений на этом слайде",
  "reference_image_source": "https://example.com/ref.png",
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
}
```

### `global_reference_image_source`
Опциональный глобальный reference для изображений на всех слайдах:
```json
"global_reference_image_source": "https://example.com/brand-style.png"
```

Поддерживаемые форматы `reference_image_source`:
- `https://...` или `http://...` (рекомендуется для multi-container окружения)
- `data:image/<type>;base64,<payload>` (поддерживается)
- локальный путь (только если файл реально доступен из контейнера backend)

## 3. Поведение пайплайна

Если передан `slides_markdown`:
- генерация outline через LLM пропускается;
- outlines формируются напрямую из входного payload;
- количество слайдов берется из длины `slides_markdown`.
- если в элементе есть `style`, оно переносится в результат слайда как `__style__`.

Если `slides_markdown` не передан:
- работает стандартный flow с генерацией outline через LLM.

## 4. Image Guidance (Smart Prompt Splitting)

`image_prompt` передается в prompt для генерации контента слайда как user guidance.

Для слайдов с массивами изображений LLM получает инструкцию:
- разложить guidance на N отдельных image prompts по числу image slots в schema;
- при нехватке деталей достроить недостающие prompts в том же стиле/контексте.

## 5. Reference Propagation

На этапе генерации контента reference пробрасывается в image-узлы как внутреннее поле:
- `__reference_image_source__`

На этапе asset generation это поле передается в:
- `ImagePrompt.reference_images`

### Приоритет reference
- `reference_image_source` на уровне слайда
- затем `global_reference_image_source`

Правило: `slide > global`.

## 6. Provider Compatibility

- `vsellm`: references используются нативно.
- Остальные провайдеры: references игнорируются с warning в логах (без ошибки запроса).

## 7. Пример запроса

```json
{
  "content": "Сделай презентацию о компании",
  "template": "general",
  "language": "Russian",
  "slides_markdown": [
    {
      "content": "## О нас\n- Рост x3\n- 120 сотрудников",
      "image_prompt": "Современный офис компании, панорамные окна, дневной свет",
      "reference_image_source": "https://example.com/style-ref.png"
    },
    {
      "content": "## Наша команда\n- CEO\n- CTO\n- COO",
      "image_prompt": "Портреты управленческой команды в едином стиле"
    },
    "## Планы на 2027\n- Выход на новые рынки"
  ],
  "global_reference_image_source": "https://example.com/global-brand-reference.png",
  "n_slides": 3
}
```

## 8. Пример ответа (старт background-задачи)

```json
{
  "presentation_id": "c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f",
  "status": "pending",
  "message": "Generation started in background",
  "poll_url": "/api/v1/ppt/presentation/status/c5c5f30a-8f95-4cc3-8dce-7f3f2bc90c4f"
}
```

## 8.1 Как получить PDF/PPTX для конкретной презентации

1. Опрашивайте `poll_url` до `status=completed`:
   - `GET /api/v1/ppt/presentation/status/{presentation_id}`
2. После `completed` вызовите экспорт:
   - `POST /api/v1/ppt/presentation/export` с телом:
```json
{
  "id": "<presentation_id>",
  "export_as": "pdf"
}
```
или
```json
{
  "id": "<presentation_id>",
  "export_as": "pptx"
}
```
3. Возьмите `path` из ответа export и скачайте файл по этому пути.

Важно:
- `POST /api/v1/ppt/presentation/generate` запускает background-генерацию и не отдает бинарник файла сразу.
- Для получения файла нужен отдельный вызов `POST /api/v1/ppt/presentation/export`.

## 9. Рекомендации API-клиенту

- Для новых интеграций используйте объектный формат `slides_markdown`.
- Если нужен единый style reference для всех слайдов, передавайте `global_reference_image_source`.
- Для точного контроля конкретного слайда задавайте `reference_image_source` в самом слайде.
- Если backend и сервис/клиент работают в разных контейнерах, используйте `http(s)` URL вместо локальных путей.
- Если передаете base64, используйте именно Data URL формат: `data:image/png;base64,...`.

## 10. Endpoint для внешнего сервиса: summary по image-slots

Если внешнему сервису нужно заранее понимать, сколько изображений ожидается в каждом layout шаблона, используйте:

`GET /api/v1/ppt/templates/{slug}/image-summary`

Особенности:
- возвращает количество image generation slots по `__image_prompt__`;
- возвращает `image_prompts` по каждому слайду (из schema, а если defaults вырезаны — fallback из исходного layout-файла), чтобы внешний сервис мог переиспользовать готовые подсказки;
- возвращает короткое описание слайда (`layout description + schema title + fields`);
- иконки не учитываются.

## 11. Endpoint для внешнего сервиса: style-summary по шаблону

Если внешнему сервису нужно понять, какие block IDs и slide-level tokens поддерживает шаблон:

`GET /api/v1/ppt/templates/{slug}/style-summary`

Возвращает:
- агрегированные `block_ids`;
- `slide_color_tokens`;
- `slide_font_tokens`;
- детализацию по каждому layout (`color_bindings`, `font_bindings`, `source_file`).

## 12. Endpoint для внешнего сервиса: schema-summary по шаблону

Если внешнему сервису нужно понимать контентную структуру слайдов (например поля
`colorCards[].hex`, `colorCards[].group`, `colorCards[].description`), используйте:

`GET /api/v1/ppt/templates/{slug}/schema-summary`

Возвращает:
- `json_schema` каждого layout;
- плоский `fields_summary` с типами/ограничениями/enum/default;
- `content_slots` (image/icon/arrays);
- `render_hints.visible_items_from_schema` (generic hints из schema).

Важно: `style-summary` и `schema-summary` решают разные задачи.
