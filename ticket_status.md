# Ticket Status

**Status:** In Progress
**Current Task:** AUTOGENERATION CUSTOM STRUCTURE + SMART IMAGE GUIDANCE
**Assignee:** [Agent / Developer]

## Completed Work
1.  **Refactoring OpenAI Configuration (Previous Task):**
    *   Renamed environment variables to `TEMPLATE_*` for template generation separation.

2.  **Fixing Image Generation (Previous Task):**
    *   **Custom Image Provider Support:** Implemented `custom_openai` provider in `ImageGenerationService`.
    *   **User Configuration Schema Update:** Added `IMAGE_GEN_API_KEY` etc.
    *   **UI Updates:** Added "Custom OpenAI" option.
    *   **Configuration Propagation:** Updated `docker-compose.yml` and `start.js`.

3.  **Debugging & Fixes (Local Application & PDF Export):**
    *   **Fixed Local Storage Paths:** Relative paths in `.env`.
    *   **Fixed Export Hangs (PDF/PPTX):** Use `APP_BASE_URL`, stub icons, json repair.

4.  **Implement Autogeneration Endpoint (Completed):**
    *   **New Service Layer:** `PresentationService`.
    *   **New Endpoint:** `POST /api/v1/ppt/presentation/generate`.

5.  **Fixing Integration & Export Issues (Completed):**
    *   **Port Configuration:** `NEXTJS_API_URL` usage.
    *   **Puppeteer Stability:** Timeouts and wait conditions.

6.  **Fixing Missing Icons & Deployment Workflow (Completed):**
    *   **Problem:** Missing static icons.
    *   **Solution:** `extract_icons.py` on startup.

7.  **Debugging Slide Generation Hangs (Completed):**
    *   **Problem:** Generation streams would hang.
    *   **Fixes:** Standardized Logging, Retries, Bug Fixes.

8.  **Streaming Session Restoration (Completed):**
    *   **Problem:** Page refresh during streaming caused total data loss.
    *   **Solution:** Implemented **incremental persistence** and **resume logic** in `/stream/{id}`.
    *   **Mechanism:**
        *   Slides are saved to DB immediately after generation (not just at the end).
        *   `stream_presentation` checks for existing slides before generating.
        *   Skips LLM for existing slides, yields them immediately ("Fast Forward").
        *   Queues asset generation for both existing (if placeholders found) and new slides.
        *   Validates `layout_id` to prevent reusing stale slides if structure changed.
        *   Cleans up orphan slides at the end.

9.  **UI/UX Enhancements (Completed - Feb 2026):**
    *   **Markdown Rendering Fix:** Fixed preview/presentation mode to properly render markdown (no more raw `**bold**` showing).
    *   **Slide Scaling:** Created `ScaledSlideWrapper` to maintain WYSIWYG editing - slides now stay at fixed 1280x720 resolution and scale proportionally.
    *   **Rich Text Formatting:**
        *   Color Picker: 10 preset colors for text
        *   Font Size: Input field + +/- buttons (8-72px range)
        *   Custom `FontSize` Tiptap extension
    *   **Performance:** Reduced markdown rendering delay from 1s to 50ms (eliminated flash of raw markdown).
    *   **Image Drag-and-Drop:** Users can now reposition images by dragging them on slides.
        *   Click vs drag distinction (5px threshold)
        *   Visual feedback (opacity, z-index)
        *   **Note:** Position persistence not yet implemented - saved to backlog.

10. **Database Migrations - Alembic (Completed - Feb 2026):**
    *   **Problem:** Отсутствие системы миграций БД — схема создавалась через `create_all()`, без версионирования.
    *   **Solution:** Внедрён Alembic для управления схемой.
    *   **Files Created:**
        *   `alembic.ini` — конфигурация
        *   `migrations/env.py` — импорт моделей, динамический DATABASE_URL
        *   `migrations/versions/b6ad4524bb04_initial_schema.py` — начальная миграция
    *   **Tables in Migration (8):**
        *   `presentations`, `slides` (FK с CASCADE DELETE)
        *   `templates`, `imageasset`, `keyvaluesqlmodel`
        *   `presentation_layout_codes`, `webhook_subscriptions`
**Assignee:** [Agent / Developer]

## Completed Work
1.  **Refactoring OpenAI Configuration (Previous Task):**
    *   Renamed environment variables to `TEMPLATE_*` for template generation separation.

2.  **Fixing Image Generation (Previous Task):**
    *   **Custom Image Provider Support:** Implemented `custom_openai` provider in `ImageGenerationService`.
    *   **User Configuration Schema Update:** Added `IMAGE_GEN_API_KEY` etc.
    *   **UI Updates:** Added "Custom OpenAI" option.
    *   **Configuration Propagation:** Updated `docker-compose.yml` and `start.js`.

3.  **Debugging & Fixes (Local Application & PDF Export):**
    *   **Fixed Local Storage Paths:** Relative paths in `.env`.
    *   **Fixed Export Hangs (PDF/PPTX):** Use `APP_BASE_URL`, stub icons, json repair.

4.  **Implement Autogeneration Endpoint (Completed):**
    *   **New Service Layer:** `PresentationService`.
    *   **New Endpoint:** `POST /api/v1/ppt/presentation/generate`.

5.  **Fixing Integration & Export Issues (Completed):**
    *   **Port Configuration:** `NEXTJS_API_URL` usage.
    *   **Puppeteer Stability:** Timeouts and wait conditions.

6.  **Fixing Missing Icons & Deployment Workflow (Completed):**
    *   **Problem:** Missing static icons.
    *   **Solution:** `extract_icons.py` on startup.

7.  **Debugging Slide Generation Hangs (Completed):**
    *   **Problem:** Generation streams would hang.
    *   **Fixes:** Standardized Logging, Retries, Bug Fixes.

8.  **Streaming Session Restoration (Completed):**
    *   **Problem:** Page refresh during streaming caused total data loss.
    *   **Solution:** Implemented **incremental persistence** and **resume logic** in `/stream/{id}`.
    *   **Mechanism:**
        *   Slides are saved to DB immediately after generation (not just at the end).
        *   `stream_presentation` checks for existing slides before generating.
        *   Skips LLM for existing slides, yields them immediately ("Fast Forward").
        *   Queues asset generation for both existing (if placeholders found) and new slides.
        *   Validates `layout_id` to prevent reusing stale slides if structure changed.
        *   Cleans up orphan slides at the end.

9.  **UI/UX Enhancements (Completed - Feb 2026):**
    *   **Markdown Rendering Fix:** Fixed preview/presentation mode to properly render markdown (no more raw `**bold**` showing).
    *   **Slide Scaling:** Created `ScaledSlideWrapper` to maintain WYSIWYG editing - slides now stay at fixed 1280x720 resolution and scale proportionally.
    *   **Rich Text Formatting:**
        *   Color Picker: 10 preset colors for text
        *   Font Size: Input field + +/- buttons (8-72px range)
        *   Custom `FontSize` Tiptap extension
    *   **Performance:** Reduced markdown rendering delay from 1s to 50ms (eliminated flash of raw markdown).
    *   **Image Drag-and-Drop:** Users can now reposition images by dragging them on slides.
        *   Click vs drag distinction (5px threshold)
        *   Visual feedback (opacity, z-index)
        *   **Note:** Position persistence not yet implemented - saved to backlog.

10. **Database Migrations - Alembic (Completed - Feb 2026):**
    *   **Problem:** Отсутствие системы миграций БД — схема создавалась через `create_all()`, без версионирования.
    *   **Solution:** Внедрён Alembic для управления схемой.
    *   **Files Created:**
        *   `alembic.ini` — конфигурация
        *   `migrations/env.py` — импорт моделей, динамический DATABASE_URL
        *   `migrations/versions/b6ad4524bb04_initial_schema.py` — начальная миграция
    *   **Tables in Migration (8):**
        *   `presentations`, `slides` (FK с CASCADE DELETE)
        *   `templates`, `imageasset`, `keyvaluesqlmodel`
        *   `presentation_layout_codes`, `webhook_subscriptions`
        *   `async_presentation_generation_tasks`
    *   **Commands:**
        *   `uv run alembic upgrade head` — применить миграции
        *   `uv run alembic revision --autogenerate -m "desc"` — создать новую миграцию
    *   **Note:** `container.db` (Ollama) оставлен без изменений — локальный SQLite.

11. **Postgres Migration Fix (Feb 2026):** Updated `migrations/env.py` to load `.env`, added `psycopg2-binary`, stamped Postgres at `b6ad4524bb04`, and upgraded to `441754d4da0d` (adds `templates.slug` and related columns).

12. **Auth & Security (Completed - Feb 2026):**
    *   **JWT Auth:** Added login/register endpoints (`/api/v1/auth/*`) with JWT tokens.
    *   **API Keys:** Added API key creation/list/revoke endpoints.
    *   **RBAC:** Roles `admin`, `editor`, `viewer`. Viewer is read-only for `/api/v1/ppt/*`.
    *   **Frontend:** Added `/login` and `/register`, plus `AuthGuard` for protected routes.
    *   **SSE Support:** Cookie-based auth to allow SSE requests (EventSource).
    *   **ENV:** Added `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRES_MINUTES`, `API_KEY_SECRET`.

13. **Export Stability Fixes (Completed - Feb 2026):**
    *   **PPTX Export:** Resolved "Presentation slides not found" error by fixing slide data retrieval logic.
    *   **PDF Export:** Fixed Puppeteer hangs by optimizing wait conditions and timeout settings.

14. **API Key Management UI (Completed - Feb 2026):**
    *   **Settings Page:** Refactored to use Tabs, separating "General" (LLM) and "API Keys" sections.
    *   **Management Component:** implemented `ApiKeyManagement.tsx` for listing, creating, and revoking keys.
    *   **Security:** Keys are generated on the backend, shown only once to the user (frontend logic), and stored as hashes.
    *   **Service Layer:** Added `apiKeyService` in frontend to interface with auth endpoints.
    *   **UI Components:** Added `Badge` component and fixed import paths.

15. **Image Provider Refactoring (Completed - Feb 2026):**
    *   Added dedicated `vsellm` image provider in backend (`ImageProvider.VSELLM`) with separate routing logic.
    *   Implemented `vsellm` generation via `chat/completions` + `tools.image_generation` and support for reference images (`reference_image_paths`).
    *   Added `vsellm` option in Settings image providers.
    *   Added model discovery for OpenAI-compatible image providers (`custom_openai`, `vsellm`) with model dropdown selection.
    *   Added shared-credentials behavior for `vsellm`: image URL/API key auto-fill from Custom LLM config by default, while model selection remains separate.
    *   Added URL preset selector in Custom LLM config (`Generic OpenAI` / `vSellm`).

## Decisions Made
*   **Shared Environment Config:** Frontend (`next.config.mjs`) loads `.env`.
*   **JSON Repair Strategy:** Using `utils/json_repair.py`.
*   **Stubbing Assets:** For non-critical assets.
*   **Consistent Internal URLs:** `NEXTJS_API_URL`.
*   **Incremental Streaming:** Prioritized data safety over atomicity. A crashed stream now leaves partial (valid) data in DB, allowing resumption.
*   **Settings UI Architecture:** Split Settings into Tabs to cleanly separate LLM configuration from Security/Auth management.
*   **Component Imports:** Enforced relative import paths in deep component trees to avoid module resolution issues.

## Handover: Next Steps for Developer
1.  **Verification - vSellm Provider:**
    *   In `/settings` select image provider `vSellm`.
    *   Set/verify `IMAGE_GEN_BASE_URL`, `IMAGE_GEN_API_KEY`, `IMAGE_GEN_MODEL`.
    *   Generate image from Image Editor and ensure non-placeholder output.
2.  **Verification - Shared Credentials Sync:**
    *   In Custom LLM config set URL/API key (optionally preset `vSellm`).
    *   Confirm image provider `vSellm` auto-fills same URL/API key by default.
    *   Confirm model fields remain independent (`CUSTOM_MODEL` vs `IMAGE_GEN_MODEL`).
3.  **Verification - Model Discovery UI:**
    *   In image provider block click `Check for available models`.
    *   Select model from dropdown and save configuration.
    *   Re-open settings and verify selected `IMAGE_GEN_MODEL` is persisted.
4.  **Verification - Reference Images:**
    *   Call `/api/v1/ppt/images/generate` with one or more `reference_image_paths`.
    *   Confirm backend accepts and processes reference images in `vsellm` flow.

## Update: Template Refactoring (Feb 2026)

### Done
- Fixed custom template invocation from `POST /api/v1/ppt/presentation/generate`.
- Added template resolver compatibility for legacy IDs (`custom-<uuid>`) and slug-based templates.
- Added auth propagation (JWT/API key) through backend -> Next.js `/api/template` -> `/schema`, so custom templates can be loaded in headless Puppeteer flow.
- Added `/schema` layout wrapper with `LayoutProvider`, enabling custom template loading during schema extraction.
- Normalized legacy custom template metadata on save:
  - `slug = custom-<uuid>`
  - `is_system = false`
  - `is_default = false`

### Remaining
- Remove/merge legacy `template-management/*` APIs into unified templates registry (`/api/v1/ppt/templates`) to avoid dual contracts.
- Add API/contract docs for template discovery and usage in generation (`template` field accepted formats).
- Add automated tests specifically for custom template generation through `/presentation/generate`.
- Optional: add UI controls for manual slug input/edit (currently absent in web flow).

### API Note
- Current web flow auto-creates slug as `custom-<uuid>`.
- For API generation now use: `"template": "custom-<uuid>"`.
- Manual custom slug can be set only via direct API call to `POST /api/v1/ppt/templates` (not via current web UI).

## Update: Preview/Export Fixes (Feb 2026)

### Completed
- **Fixed white thumbnail previews** (dashboard + left panel in presentation page):
  - Root cause: text replacement pipeline in tiny scaled preview context could render blank states for some system slides.
  - Fix: thumbnail render now disables text replacer; full slide render keeps it enabled.
- **Fixed export showing login screen instead of slides** (`PRESENTON / Welcome back`):
  - Root cause: headless Puppeteer opened `/pdf-maker` without authenticated browser context.
  - Fixes:
    - Next export routes now pass auth context (`token`/`api_key`) into `/pdf-maker` URL.
    - `AuthGuard` now bootstraps auth from query `token` for internal/headless render flows.
    - Frontend export calls send auth headers explicitly.
    - FastAPI export endpoints now forward auth context to Next export routes.

### Current State
- Export (PDF/PPTX) should render the actual presentation content for authenticated sessions.
- Template refactoring branch now includes:
  - custom template generation fixes,
  - manual slug UI support,
  - preview rendering stability,
  - export auth propagation.
  - dedicated `vsellm` image provider flow with reference-image support,
  - OpenAI-compatible image model discovery/selection in Settings,
  - default shared URL/API key sync between Custom LLM and `vsellm`.

## Update: Custom Structure + Smart Image Guidance (Feb 17, 2026)

### Completed
- Added request-level support for custom structure in autogeneration:
  - `slides_markdown` now accepts legacy `List[str]` and object format.
  - New object format: `{ content, image_prompt?, reference_image_source? }`.
  - Added `global_reference_image_source` at root request level.
- Added backward-compatible normalization of `slides_markdown` before pipeline execution.
- Updated autogeneration orchestration:
  - If `slides_markdown` is provided, outline LLM generation is skipped.
  - Presentation outlines are built directly from request payload.
  - `n_slides` is aligned with provided slide structure length.
  - Dynamic structure generation uses `using_slides_markdown=True` for better layout selection.
- Added image-guidance support in slide content generation:
  - `image_prompt` is injected into LLM prompt as "User-Provided Image Guidance".
  - Guidance includes array-splitting instructions for multiple image slots.
- Added reference propagation:
  - `reference_image_source` is injected into generated image nodes as `__reference_image_source__`.
  - `process_slide_and_fetch_assets(...)` and old/new slide asset flow now pass references into `ImagePrompt.reference_images`.
- Provider compatibility policy:
  - `vsellm` uses reference images directly.
  - Non-`vsellm` providers ignore references with warning logs (no request failure).

### Tests Added
- `servers/fastapi/tests/test_generate_presentation_request_model.py`
- `servers/fastapi/tests/test_generate_slide_content_helpers.py`
- `servers/fastapi/tests/test_process_slides_references.py`

### Verification
- Targeted backend test run for the new functionality: `4 passed`.

### Remaining (for this feature)
- Add integration-level API test for `/api/v1/ppt/presentation/generate` with object-based `slides_markdown` payload.
- Add end-to-end smoke test for `vsellm` reference flow with real provider response variants.

## Update: Layout Validation + Global Auto-Fit (Completed - Feb 26, 2026)

### Completed
- Добавлена post-render layout validation для web + export:
  - Веб: рендер слайда в editor/present mode.
  - Экспорт: `export-as-pdf` и `presentation_to_pptx_model`.
- Добавлены единые DOM-якоря измерений:
  - `data-slide-root`
  - `data-layout-path`
- Внедрён глобальный auto-fit на слайд (единый scale), чтобы все текстовые блоки уменьшались одинаково:
  - `slide.properties.layoutValidation.blocks.__all__.fontScale`
- Интеграция сохранения:
  - Веб-фиксы сохраняются в Redux и уходят в persist через стандартный update flow.
- Исправлен headless render mode:
  - В `/pdf-maker` отключён edit-mode рендер для export-пути, чтобы исключить side effects от edit-wrapper.
- Добавлены export debug-артефакты:
  - JSON с issues/fixes/overrides;
  - screenshot для unresolved кейсов;
  - путь: `APP_DATA_DIRECTORY/exports/layout_debug/<presentation_id>/`.

### Current Behavior
- Auto-fix выполняется:
  - при web-рендере;
  - перед PDF/PPTX export.
- Экспорт работает в режиме best-effort:
  - сначала фиксит layout;
  - по умолчанию не блокируется остаточными issues (`failOnUnresolved=false`).

### Active Defaults
- Web:
  - `maxIterations=6`, `minScale=0.5`, `scaleStep=0.9`
- Export:
  - `maxIterations=8`, `minScale=0.45`, `scaleStep=0.9`, `failOnUnresolved=false`

### Remaining
- Web-режим пока не делает авто-перегенерацию текста на лету при каждом редактировании; LLM reflow используется в export fallback цепочке.

## Update: Layout Validation v2 (Completed - Feb 26, 2026)

### Completed
- Replaced global slide scaling with role/group-aware auto-fit:
  - locked roles: `title`, `subtitle`, `locked`;
  - adaptive roles: `body`, `caption`.
- Added semantic text attributes in runtime:
  - `data-layout-role`
  - `data-layout-group`
  - `data-slide-id`
- Implemented hash-scoped web persistence for fixes:
  - `layoutValidation.contentHash`
  - `layoutValidation.layoutSignature`
  - `layoutValidation.version=2`
- Updated Redux layout validation storage:
  - stores `groups` (v2), keeps `blocks` as compatibility mirror.
- Reworked export validator to follow:
  1. deterministic role/group scaling,
  2. LLM reflow attempt,
  3. clamp fallback.
- Added backend endpoint for text compression without layout mutation:
  - `POST /api/v1/ppt/slide/layout-reflow`
- Export routes now pass auth into layout validator to allow protected LLM reflow calls.

### Current State
- Web rendering preserves hierarchy better (headings are not auto-shrunk).
- Multi-block body text is scaled consistently by group.
- Export uses fixed/reflowed content before final PDF/PPTX capture and remains best-effort by default.

### Notes
- Legacy `layoutValidation.blocks.__all__` data is still normalized and supported for backward compatibility.
