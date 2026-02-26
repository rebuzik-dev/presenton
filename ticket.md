# Ticket: Handover & Analysis Summary

## Task
Implement Autogeneration Endpoint & Fix Integration Issues

## Goal
1.  **"One-Click" Generation:** Create a `POST /generate` endpoint that orchestrates the entire pipeline (Create -> Outline -> Structure -> Content -> Assets) in the background.
2.  **Refactor Logic:** Move business logic from API endpoints to a reusable `PresentationService`.
3.  **Fix Integration Bugs:** Resolve connectivity issues between FastAPI (backend) and Next.js (frontend/renderer) that were causing `ConnectionRefused` and `Timeout` errors.

## Context
The user needed a way to generate a presentation non-interactively. Previously, the client had to make multiple sequential API calls. This new endpoint encapsulates that flow. 
During implementation, we discovered that the "Layout" system relies on Puppeteer scraping the Frontend, which caused issues when ports weren't aligned or timeouts were too short.

## System Architecture Changes
-   **Service Layer:** Introduced `PresentationService` (`servers/fastapi/services/presentation_service.py`) to handle the heavy lifting.
-   **Next.js API Integration:** The backend now talks to Next.js API routes (`/api/template`, `/api/presentation_to_pptx_model`) which in turn use Puppeteer.
-   **Environment Variables:**
    -   `NEXTJS_API_URL`: Added to control where the backend looks for the renderer (defaults to `http://localhost:3000`).
    -   `APP_BASE_URL`: Deprecated/Unified into `NEXTJS_API_URL` usage for consistency in `export_utils.py`.

## Decisions Made
-   **Hybrid Rendering:** We kept the architecture where layouts are React components. The backend asks the frontend to "render" them (via Puppeteer) to extract schemas and build PPTX models.
-   **Extended Timeouts:** Increased Puppeteer navigation timeouts to **120s** and relaxed wait conditions to `networkidle2` to handle complex slide generation without falsely timing out.
-   **Port Configuration:** Explicitly configured backend utilities to respect the Next.js port (3000), fixing the `client_connector_error` on localhost.

## Resolved Issues (DONE)
-   **[DONE] Postgres Migration Fix (Templates)**: Alembic now loads `.env` in `migrations/env.py`; Postgres schema was stamped at `b6ad4524bb04` and upgraded to `441754d4da0d` to add `templates.slug` and related columns. Added `psycopg2-binary` for Alembic sync engine.
-   **[FIXED] 404 Icons during Export**: The system now automatically extracts valid SVG icons from `icons.json` to `public/static/icons` on startup. This fixed the "Missing Icon" errors that caused export hangs.
-   **[FIXED] Autogeneration Endpoint**: `POST /generate` works and includes an optional "Export" step.
-   **[FIXED] Server Startup**: `server.py` now handles the "pre-flight" check for icons automatically.
-   **[FIXED] Markdown Rendering in Preview**: Enabled `TiptapTextReplacer` in View Mode to properly render markdown formatting (`**bold** -> **bold**).
-   **[FIXED] Slide Scaling Issue**: Created `ScaledSlideWrapper` component that maintains fixed aspect ratio (1280x720) and prevents text reflow on window resize.
-   **[FIXED] Rich Text Formatting**: Added color picker (10 presets) and font size controls (8-72px) to Tiptap editor's BubbleMenu.
-   **[FIXED] Markdown Flash on Load**: Reduced text replacement delay from 1000ms to 50ms and added fade-in animation.
-   **[FIXED] Image Drag-and-Drop**: Implemented drag-and-drop repositioning for images with click/drag distinction (5px threshold).
-   **[DONE] Alembic Migrations**: Внедрена система миграций БД (Alembic) для 8 таблиц: presentations, slides, templates, imageasset, keyvaluesqlmodel, presentation_layout_codes, webhook_subscriptions, async_presentation_generation_tasks.

## Next Actions for Developer
-   **Monitoring**: Just ensure that the `extract_icons.py` script has permissions to write to `servers/nextjs/public/static` in your production environment.
-   **Deployment**: No special manual steps needed; the start script handles everything.

# Auth/Security - Implementation Notes (Feb 2026)

## Summary
Implemented JWT authentication (login/password) + API Keys, and enforced RBAC across all `/api/v1/ppt/*` endpoints.

## What Was Added/Changed
### Backend
- **New models**: `UserModel`, `ApiKeyModel`
  - `servers/fastapi/models/sql/user.py`
  - `servers/fastapi/models/sql/api_key.py`
- **Auth service** (JWT, password hashing, API key hashing):
  - `servers/fastapi/services/auth_service.py`
- **Auth endpoints**:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/auth/users` (admin)
  - `PATCH /api/v1/auth/users/{user_id}/role` (admin)
  - `POST /api/v1/auth/api-keys` (admin/editor)
  - `GET /api/v1/auth/api-keys` (admin/editor)
  - `DELETE /api/v1/auth/api-keys/{api_key_id}` (admin/editor)
  - Router: `servers/fastapi/api/v1/auth/router.py`
- **RBAC enforcement**:
  - `servers/fastapi/api/deps.py` defines `enforce_ppt_access` (viewer read-only)
  - Applied globally to `/api/v1/ppt/*` router
  - `/api/v1/webhook/*` requires admin/editor
  - `/api/v1/mock/*` requires admin
- **Migration**:
  - `servers/fastapi/migrations/versions/9c1a3b7dbe12_add_auth_tables.py`
- **ENV/Config**:
  - `.env` and `docker-compose.yml` now include:
    - `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRES_MINUTES`, `API_KEY_SECRET`

### Frontend
- **Login/Register pages**:
  - `servers/nextjs/app/login/page.tsx`
  - `servers/nextjs/app/register/page.tsx`
- **AuthGuard**:
  - `servers/nextjs/app/(presentation-generator)/components/AuthGuard.tsx`
  - Wraps all routes in `(presentation-generator)` and root `/`
  - Uses `/api/v1/auth/me` for validation
  - Stores JWT in localStorage + cookie for SSE
- **Auth headers**:
  - `servers/nextjs/app/(presentation-generator)/services/api/header.ts`
  - All API calls now attach Authorization header automatically

## Tasks Done
- [x] JWT login/password auth added (FastAPI)
- [x] API key creation/validation added
- [x] RBAC roles: `admin`, `editor`, `viewer`
- [x] Protect `/api/v1/ppt/*` and enforce viewer read-only
- [x] Protect `/api/v1/webhook/*` and `/api/v1/mock/*`
- [x] Frontend login/register + auth guard
- [x] Frontend API requests now include auth
- [x] API Keys UI panel implemented in Settings (`ApiKeyManagement.tsx`)
- [x] Added dedicated image provider `vsellm` in backend (`ImageProvider.VSELLM`) with provider-specific generation flow
- [x] Added reference-image support for image generation endpoint (`reference_image_paths`) in `vsellm` flow
- [x] Added `vsellm` option in Settings image provider list
- [x] Added model discovery and dropdown selection for OpenAI-compatible image providers (`custom_openai`, `vsellm`)
- [x] Added default URL/API key sync from Custom LLM config to `vsellm` image config with separate model selection
- [x] Added Custom LLM URL preset selector (`Generic OpenAI` / `vSellm`)

## Tasks Remaining / TODO
- [ ] **SSE Token Support (Optional Improvement)**
  **Where**: `servers/nextjs/app/(presentation-generator)/outline/hooks/useOutlineStreaming.ts` and
  `servers/nextjs/app/(presentation-generator)/presentation/hooks/usePresentationStreaming.ts`
  **What**: For robust SSE auth without cookies, pass `?token=<JWT>` when creating `EventSource`.
  (Currently auth relies on cookie set by AuthGuard/login)

- [ ] **Admin UI (Optional)**
  **Where**: Add an admin page under `servers/nextjs/app/(presentation-generator)/settings`
  **What**:
  - List users (`GET /api/v1/auth/users`)
  - Change role (`PATCH /api/v1/auth/users/{user_id}/role`)
  - Show role badges in UI

- [ ] **Image Provider Sync Toggle (Optional)**
  **Where**: `servers/nextjs/components/LLMSelection.tsx`
  **What**: Add explicit toggle `Use same credentials as Custom LLM` for image provider config.
  **Why**: Current `vsellm` behavior auto-syncs URL/API key by default; explicit toggle will make this behavior transparent and controllable.

# Тикет
- [ ] Разобраться и описать разницу между `/generate/async` (Autogeneration) и `/presentation/create` (Interactive).
    - `/generate/async`: для API-клиентов, фоновая генерация, вебхуки.
    - `/presentation`: для UI, пошаговая генерация, стриминг SSE.
- [x] Реализовать восстановление сессии стриминга по ID презентации (`/stream/{id}`), чтобы при перезагрузке страницы прогресс не терялся (State Persistence).
- [ ] Проверить и окончательно подчистить логи после отладки (убрать лишний debug шум).
- [x] Поддержать пользовательскую структуру слайдов в `POST /api/v1/ppt/presentation/generate` через `slides_markdown` (legacy `List[str]` + новый объектный формат).
- [x] Добавить пользовательские image-guidance (`image_prompt`) на уровне слайда для генерации `__image_prompt__`.
- [x] Добавить глобальные и слайдовые image references (`global_reference_image_source` / `reference_image_source`) с приоритетом `slide > global`.
- [x] Добавить отдельного image-провайдера `vsellm` с provider-specific логикой генерации.
- [x] Добавить поддержку reference images в image generation endpoint (`reference_image_paths`) для `vsellm`.
- [x] Добавить выбор image-модели из списка доступных моделей в Settings для OpenAI-compatible image providers.
- [x] Реализовать автоподстановку URL/API key из Custom LLM в `vsellm` image config (по умолчанию), сохранив раздельные поля моделей.

## Backlog (Новые задачи)
- [ ] **Persist Image Position**: Сохранять позицию перетащенных изображений в Redux/database. Сейчас позиция теряется при обновлении страницы и не учитывается при генерации.
    - Добавить поле `__position__: { x, y }` в схему изображений
    - Dispatch Redux action `updateImagePosition` при завершении drag
    - Восстанавливать позицию из `data.__position__` при рендере
    - Сохранять в базу данных при сохранении презентации
- [ ] **Template Preview UX (hover metadata)**: На странице `http://localhost:3000/template-preview` добавить отображение служебной информации при наведении:
    - Показывать prompt для нейросети на блоках с изображениями.
    - Показывать границы текстовых блоков в превью.
    - Показывать slide-level prompt, используемый для генерации слайда.

# Template Refactoring Update (Feb 2026)

## What Was Fixed
- Fixed custom template usage in `POST /api/v1/ppt/presentation/generate`.
- Updated backend template resolver to support:
  - slug-based templates from `templates` table;
  - legacy custom IDs in format `custom-<uuid>`;
  - legacy custom templates without DB `layouts` via Next.js schema extraction.
- Added auth propagation in generation flow:
  - `/presentation/generate` captures auth context;
  - `/api/template` receives `token`/`api_key` and forwards to `/schema`;
  - `/schema` can load custom templates from `template-management` APIs in protected mode.
- Added `servers/nextjs/app/schema/layout.tsx` with `LayoutProvider` so `/schema` works with custom templates.
- Normalized legacy template save (`/api/v1/ppt/template-management/templates`) to persist:
  - `slug = custom-<uuid>`
  - `is_system = false`
  - `is_default = false`

## What Remains
- Unify template contract: migrate away from dual path (`template-management/*` + `/templates`) to single source.
- Add explicit API docs/examples for template discovery and passing custom template IDs into `/presentation/generate`.
- Add integration tests for custom templates in autogeneration path.
- Optional UI work: allow manual slug input/edit in web template creation flow.

## Slug / API Usage Right Now
- In current web flow, custom templates get auto slug: `custom-<uuid>`.
- You can call generation via API using this value:
  - `"template": "custom-<uuid>"`
- Setting arbitrary custom slug from web UI is **not implemented yet**.
- Arbitrary slug is available only through direct API call to `POST /api/v1/ppt/templates`.

# Update: Preview + Export Auth (Feb 2026)

## Done
- Fixed white/empty mini-previews (dashboard cards + left sidebar thumbnails):
  - Added optional `enableTextReplacer` flag in `useTemplateLayouts.renderSlideContent(...)`.
  - Disabled `TiptapTextReplacer` only for thumbnail rendering paths.
  - Main slide rendering/editing path remains unchanged.
- Fixed export rendering login page instead of presentation:
  - Next.js export routes now forward auth context to headless `/pdf-maker` as query params (`token`, `api_key`).
    - `servers/nextjs/app/api/export-as-pdf/route.ts`
    - `servers/nextjs/app/api/presentation_to_pptx_model/route.ts`
  - `AuthGuard` now accepts `token` from query for headless/internal flows and initializes `localStorage` + cookie before auth check.
    - `servers/nextjs/app/(presentation-generator)/components/AuthGuard.tsx`
  - Frontend export calls now send auth headers explicitly.
    - `servers/nextjs/app/(presentation-generator)/presentation/components/Header.tsx`
  - FastAPI export endpoints now propagate request auth context to Next.js export routes.
    - `servers/fastapi/api/v1/ppt/endpoints/presentation.py`
    - `servers/fastapi/utils/export_utils.py`

## Result
- Previews for system templates (including `general`) render correctly in thumbnails.
- PDF/PPTX export no longer captures the login screen in place of slides for authenticated flows.

# Update: Image Provider Refactoring (Feb 2026)

## Done
- Added dedicated image provider `vsellm` in backend and frontend settings.
- Implemented provider-specific generation path for `vsellm` via `chat/completions` with image-generation tool payload.
- Added support for reference images via `reference_image_paths` in `/api/v1/ppt/images/generate`.
- Added OpenAI-compatible image model discovery (`Check for available models`) and dropdown model selection for image providers.
- Added default credentials sync behavior from Custom LLM config to `vsellm` image config, keeping model fields separate.
- Added `vSellm` URL preset in Custom LLM configuration.

## Remaining
- Add explicit UI toggle to enable/disable shared credentials sync (`Use same credentials as Custom LLM`).
- Add deeper integration tests for `vsellm` response variants and reference-image generation flow.

# Update: Custom Structure + Smart Image Guidance (Feb 17, 2026)

## Done
- `GeneratePresentationRequest` расширен:
  - `slides_markdown: List[Union[str, SlideMarkdownInput]]`
  - `global_reference_image_source`
  - нормализация legacy строкового формата.
- `SlideOutlineModel` расширен полями:
  - `image_prompt`
  - `reference_image_source`
- В autogeneration flow:
  - при наличии `slides_markdown` outline LLM skip;
  - outlines собираются из запроса;
  - `n_slides` синхронизируется по длине пользовательской структуры;
  - для dynamic layout selection включен `using_slides_markdown=True`.
- В `generate_slide_content`:
  - добавлен блок `User-Provided Image Guidance`;
  - guidance учитывается при генерации `__image_prompt__`;
  - во все image-узлы добавляется `__reference_image_source__`.
- В `process_slides`:
  - references пробрасываются в `ImagePrompt.reference_images`;
  - поддержано для обоих путей: первичная генерация и old/new diff flow.
- Политика совместимости провайдеров:
  - references активно используются в `vsellm`;
  - для остальных провайдеров references игнорируются с warning (без hard fail).

## Tests
- Добавлены тесты:
  - `servers/fastapi/tests/test_generate_presentation_request_model.py`
  - `servers/fastapi/tests/test_generate_slide_content_helpers.py`
  - `servers/fastapi/tests/test_process_slides_references.py`
- Таргетный прогон: `4 passed`.
