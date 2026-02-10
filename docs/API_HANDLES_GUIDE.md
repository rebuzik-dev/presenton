# API Guide: Вызов Ручек (Templates + Generate)

Дата обновления: февраль 2026

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
    "template": "sales-deck-v2",
    "export_as": "pptx"
  }'
```

### 3.2 Проверка статуса
```bash
curl "http://localhost:8000/api/v1/ppt/presentation/status/<presentation_id>" \
  -H "Authorization: Bearer <JWT>"
```

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

Он используется как общий реестр, но в текущем UI custom-template поток все еще использует `template-management/*`.
