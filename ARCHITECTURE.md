# Architecture

## Main Services
- **Frontend** (`servers/nextjs`):
    - Next.js 14+ application.
    - Uses React, Tailwind CSS, Radix UI.
    - Handles UI for presentation generation, editing, and preview.
- **Backend** (`servers/fastapi`):
    - FastAPI application (Python).
    - Handles core logic: LLM interaction, PPTX generation (`python-pptx`), Image generation integrations.
    - MCP Server implementation (`mcp_server.py`).
- **Database**:
    - PostgreSQL (via `docker-compose` service `db`).
    - PostgreSQL (via `docker-compose` service `db`).
    - Accessed via `asyncpg` / `sqlmodel` (SQLAlchemy).

## Auth & Security (NEW)
The system now requires authentication for all `/api/v1/ppt/*` endpoints and supports
both JWT (login/password) and API keys.

### Auth Flows
- **JWT (Login/Password)**:
  - `POST /api/v1/auth/register` creates a user (first user becomes `admin`).
  - `POST /api/v1/auth/login` returns a JWT.
  - JWT is sent via `Authorization: Bearer <token>` and also stored in a cookie (`auth_token`) for SSE.
- **API Key**:
  - `POST /api/v1/auth/api-keys` (admin/editor) creates a new API key.
  - Use `X-API-Key: <key>` header for API clients.

### Role-Based Access
- Roles: `admin`, `editor`, `viewer`.
- All `/api/v1/ppt/*` endpoints are protected by `enforce_ppt_access` dependency.
  - `viewer` is read-only (GET/HEAD/OPTIONS only).
  - `editor` and `admin` can write.
- `/api/v1/webhook/*` requires `admin/editor`.
- `/api/v1/mock/*` requires `admin`.
- Admin-only endpoints:
  - `GET /api/v1/auth/users`
  - `PATCH /api/v1/auth/users/{user_id}/role`

### Key Backend Files
- Dependencies & guards: `servers/fastapi/api/deps.py`
- Auth endpoints: `servers/fastapi/api/v1/auth/router.py`
- Auth service: `servers/fastapi/services/auth_service.py`
- Models: `servers/fastapi/models/sql/user.py`, `servers/fastapi/models/sql/api_key.py`
- Migration: `servers/fastapi/migrations/versions/9c1a3b7dbe12_add_auth_tables.py`

### Frontend Auth
- AuthGuard wraps all `(presentation-generator)` routes and `/`.
  - It validates `/api/v1/auth/me` and redirects to `/login` if invalid.
  - It also refreshes the cookie for SSE auth.
- Login/Register pages:
  - `servers/nextjs/app/login/page.tsx`
  - `servers/nextjs/app/register/page.tsx`
- API header helper attaches JWT automatically:
  - `servers/nextjs/app/(presentation-generator)/services/api/header.ts`

## Configuration Flow (Critical)
The application uses a hybrid configuration system (File-based + Env-based). Understanding this is key to debugging "Why is my setting not working?".

1.  **UI Level**: User saves settings in the React UI (`LLMSelection.tsx`).
2.  **Next.js API**: POST request to `/api/user-config`.
3.  **Persistence**: Data is saved to `userConfig.json` (located in a shared volume or local path).
4.  **Backend Startup**:
    - The Node.js start script (`start.js`) reads environment variables (`.env`) and merges them into `userConfig.json`.
    - **Note:** Environment variables usually take precedence if hardcoded in `start.js`.
5.  **Runtime**: Python services (`ImageGenerationService`) read configuration from the loaded Pydantic `UserConfig` model.

**Important:** If you add a new environment variable, you must check `docker-compose.yml` to ensure it is passed to the container. The app **cannot** see variables from your host OS unless explicitly mapped.

## Patterns
- **Frontend**:
    - Component-based UI (`components/`).
    - API abstraction layer (`lib/api.ts` likely).
    - Redux for state management (`store/`).
- **Backend**:
    - Service-Repository pattern (implied by `services/` directory).
    - Pydantic models for data validation (`models/`).
    - API Router pattern (`api/`).

## Errors and Logging
- **Logging**:
    - Standard Python logging to stdout/stderr.
    - Docker captures these logs.
- **Error Handling**:
    - FastAPI `HTTPException` for API errors.
    - Pydantic validation errors for bad requests.

## Do Not Touch vs Safe to Touch
### Do Not Touch (⚠️ Caution)
- `servers/fastapi/utils/` - Core utilities, change with care.
- `servers/nextjs/lib/` - Core frontend libraries.
- `Dockerfile`, `docker-compose.yml` - Infrastructure config, unless you know what you are doing.

### Safe to Touch (✅ Norm)
- `servers/fastapi/services/` - Business logic additions.
- `servers/fastapi/api/` - New endpoints.
- `servers/nextjs/components/` - UI components.
- `servers/nextjs/app/` - Pages and layouts.

## Key Subsystems
### Autogeneration Pipeline
Orchestrated by `PresentationService` (`servers/fastapi/services/presentation_service.py`):
1.  **Generate Outlines**: Logic in `services/presentation_service.py`.
2.  **Prepare Structure**: Fetches layout schema from Next.js (`/api/template`) via Puppeteer if needed.
3.  **Generate Content**: LLM interaction per slide.
    *   **Resilience**: Uses **Retry Logic** (3 attempts, 60s timeout) to handle transient LLM hangs.
    *   **Logging**: Uses structured `custom_logger` for detailed tracing of every retry attempt.
4.  **Fetch Assets**: `ImageGenerationService` + `IconFinderService`.
5.  **Export**: Puppeteer renders `http://localhost:3000/presentation/...` to PDF/PPTX.

> [!NOTE]
> **Legacy Removal**: The old monolithic endpoints (`/generate/async`, `/generate/sync`) in `presentation.py` have been removed in favor of the `PresentationService` architecture.
> All generation tasks (both interactive `/presentation/create` and background `/presentation/generate`) now rely on the unified Service Layer.

### Assets & Icons (Performance Optimization)
-   **Problem**: 1500+ static SVG icons are needed for rendering, but checking them into Git bloats the repo.
-   **Solution**: Icons are stored packed in `servers/fastapi/assets/icons.json`.
-   **Deployment**: On server startup (`server.py`), `utils/extract_icons.py` is run automatically. It unpacks missing icons to `servers/nextjs/public/static/icons/bold/`.
-   **Git**: The extracted folder `servers/nextjs/public/static/icons` is in `.gitignore`.

## Auth Configuration (ENV)
Add/confirm these in `.env` and `docker-compose.yml`:
- `JWT_SECRET` (required)
- `JWT_ALGORITHM` (default `HS256`)
- `JWT_EXPIRES_MINUTES` (default `720`)
- `API_KEY_SECRET` (optional; falls back to `JWT_SECRET` if missing)

## Template Resolution (Feb 2026 Update)

### `/presentation/generate` Template Resolution Order
Autogeneration (`POST /api/v1/ppt/presentation/generate`) resolves `template` via `servers/fastapi/utils/get_layout_by_name.py` in this order:
1. Find template by `slug` in `templates` table.
2. Legacy fallback for IDs like `custom-<uuid>`: strip prefix and search by `TemplateModel.id`.
3. If system template, fetch schema from Next.js via `/api/template?group=<slug>`.
4. If custom template has DB `layouts`, build `PresentationLayoutModel` directly from DB JSON.
5. If custom template has no DB `layouts` (legacy `template-management` flow), fetch schema from Next.js `/schema`.

### Auth Propagation for Headless Template Fetch
- Backend `/presentation/generate` now captures auth (`Authorization` bearer / cookie token / `X-API-Key`).
- These credentials are passed to Next.js `/api/template` as query params (`token`, `api_key`).
- Next.js `/api/template` forwards them to `/schema`.
- `LayoutContext` (used by `/schema`) reads query auth and can load custom layouts from:
  - `GET /api/v1/ppt/template-management/summary`
  - `GET /api/v1/ppt/template-management/get-templates/{presentation_id}`

### Legacy Custom Template Normalization
- `POST /api/v1/ppt/template-management/templates` now persists:
  - `slug = custom-<template_uuid>`
  - `is_system = false`
  - `is_default = false`
- This keeps legacy custom templates visible/resolvable through the common `templates` table.

### Current Limitation
- Web UI currently **does not** allow entering a custom slug manually.
- In web flow, slug is auto-generated as `custom-<uuid>`.
- Manual custom slug creation is possible only by direct API call to `POST /api/v1/ppt/templates` (not from current web UI).

## Layout Validation + Global Auto-Fit (Feb 26, 2026)

### What Was Added
- Introduced post-render layout validation in both **web rendering** and **headless export** paths.
- Validation now checks real DOM geometry, not only schema char limits:
  - text overflow/clipping inside containers;
  - text out-of-bounds relative to slide root.
- Added unified slide anchors for measurement:
  - `data-slide-root` on rendered slide wrapper;
  - `data-layout-path` on text blocks produced by `TiptapTextReplacer`.

### Auto-Fix Policy (Current)
- Auto-fix is now **global per slide** (single shared scale), not per single block:
  - key: `slide.properties.layoutValidation.blocks.__all__.fontScale`.
- This ensures visual consistency across multiple text blocks on the same slide.
- Deterministic retry loop:
  - Web defaults: `maxIterations=6`, `minScale=0.5`, `scaleStep=0.9`.
  - Export defaults: `maxIterations=8`, `minScale=0.45`, `scaleStep=0.9`.

### Web Runtime Behavior
- Validation + auto-fix run during slide rendering (editor + present mode).
- Applied fixes are stored in Redux and persisted through normal presentation save/update flow in `slide.properties.layoutValidation`.
- Subsequent renders reuse stored `__all__` scale so fixes are stable across refresh/export.

### Export Runtime Behavior
- Both export routes run layout validation before final output:
  - `POST /api/export-as-pdf`
  - `GET /api/presentation_to_pptx_model`
- `pdf-maker` now renders slides in non-edit mode (`renderSlideContent(..., false)`) to avoid edit-wrapper side effects in headless geometry.
- Export uses **best-effort** policy:
  - applies auto-fix before export;
  - does not hard-fail by default if residual issues remain.

### Debug Artifacts
- Export validation writes diagnostics to:
  - `APP_DATA_DIRECTORY/exports/layout_debug/<presentation_id>/`
- Artifacts include:
  - `*_layout_issues_*.json` (issues, applied fixes, overrides);
  - unresolved screenshot `*_layout_unresolved_*.png` when issues remain.

### Current Limitation
- LLM reflow is currently used in export fallback flow; web runtime still prefers deterministic scaling without automatic content rewrite during editing.
- If unresolved issues remain after reflow + clamp, export is still best-effort by default (`failOnUnresolved=false`).

## Layout Validation v2: Role/Group + Hash Cache + Reflow (Feb 26, 2026)

### Key Changes
- Replaced slide-wide `__all__` scaling with role/group-aware scaling:
  - `title/subtitle/locked` are protected (not scaled);
  - only `body/caption` are adaptive.
- Added semantic attributes in runtime DOM:
  - `data-layout-role`
  - `data-layout-group`
  - `data-slide-id`
- Added hash-scoped persistence for web fixes:
  - `layoutValidation.contentHash`
  - `layoutValidation.layoutSignature`
  - cached groups are reused only when hash/signature match.

### Web Runtime (Editor/Present)
- `TiptapTextReplacer` now infers role/group for each text block and applies scaling only to adaptive roles.
- `SlideContent` and `PresentationMode` now validate using hash-aware cached groups and store:
  - `groups` (v2),
  - `density`,
  - `clampedPaths`,
  - `version=2`.
- Legacy `blocks.__all__` and path-based scales are still read and normalized for backward compatibility.

### Export Runtime (PDF/PPTX)
- Export validator now uses the same role/group strategy per slide.
- Added fallback chain for unresolved slides:
  1. deterministic group scaling,
  2. backend LLM text reflow (`POST /api/v1/ppt/slide/layout-reflow`),
  3. clamp fallback for remaining adaptive blocks.
- Auth context is propagated into layout validation export step to allow protected reflow calls.

### New Backend API
- Added endpoint:
  - `POST /api/v1/ppt/slide/layout-reflow`
- Purpose:
  - compress specific text fields by path for a given `slide_id`,
  - keep slide/layout unchanged,
  - return path->text updates for headless export fix cycle.
