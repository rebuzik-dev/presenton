# Autogeneration: Custom Structure + Smart Image Guidance

Дата обновления: 17 февраля 2026

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
  "reference_image_source": "https://example.com/ref.png"
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

## 9. Рекомендации API-клиенту

- Для новых интеграций используйте объектный формат `slides_markdown`.
- Если нужен единый style reference для всех слайдов, передавайте `global_reference_image_source`.
- Для точного контроля конкретного слайда задавайте `reference_image_source` в самом слайде.
- Если backend и сервис/клиент работают в разных контейнерах, используйте `http(s)` URL вместо локальных путей.
- Если передаете base64, используйте именно Data URL формат: `data:image/png;base64,...`.
