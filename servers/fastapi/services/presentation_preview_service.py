from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Optional
import uuid

import aiohttp
from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.presentation_preview import (
    PresentationPreviewManifest,
    SlidePreviewManifestItem,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from utils.get_env import get_app_data_directory_env


_preview_locks: dict[uuid.UUID, asyncio.Lock] = {}
PREVIEW_RENDERER_REVISION = "schema-media-v2"


def compute_presentation_preview_revision(
    presentation: PresentationModel,
    slides: list[SlideModel],
) -> str:
    payload = {
        "renderer_revision": PREVIEW_RENDERER_REVISION,
        "layout": presentation.layout,
        "slides": [
            {
                "index": slide.index,
                "layout": slide.layout,
                "content": slide.content,
                "properties": slide.properties,
            }
            for slide in sorted(slides, key=lambda item: item.index)
        ],
    }
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def derive_slide_preview_title(content: Any, index: int) -> str:
    for key in ("title", "heading", "headline"):
        value = _find_named_text(content, key)
        if value:
            return value
    return f"Slide {index + 1}"


def get_preview_directory(
    presentation_id: uuid.UUID,
    *,
    app_data_directory: Optional[str] = None,
) -> Path:
    app_data = app_data_directory or get_app_data_directory_env() or "./app_data"
    return (Path(app_data).resolve() / "previews" / str(presentation_id)).resolve()


def resolve_preview_file_path(
    public_path: str,
    presentation_id: uuid.UUID,
    *,
    app_data_directory: Optional[str] = None,
) -> Path:
    prefix = f"/app_data/previews/{presentation_id}/"
    if not public_path.startswith(prefix):
        raise ValueError("Preview path is outside the presentation preview directory")
    filename = public_path[len(prefix) :]
    if not filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid preview filename")
    preview_directory = get_preview_directory(
        presentation_id,
        app_data_directory=app_data_directory,
    )
    candidate = (preview_directory / filename).resolve()
    if candidate.parent != preview_directory:
        raise ValueError("Preview path traversal is not allowed")
    return candidate


async def get_presentation_preview_manifest(
    sql_session: AsyncSession,
    presentation_id: uuid.UUID,
) -> PresentationPreviewManifest:
    presentation, slides = await _get_presentation_and_slides(
        sql_session,
        presentation_id,
    )
    revision = compute_presentation_preview_revision(presentation, slides)
    manifest = _read_manifest(presentation_id)
    if manifest and manifest.revision == revision:
        if manifest.state == "ready" and not _manifest_files_are_ready(manifest):
            return _empty_manifest(
                presentation_id,
                revision,
                slides,
                state="stale",
                warnings=["One or more cached preview files are missing"],
            )
        return manifest
    return _empty_manifest(
        presentation_id,
        revision,
        slides,
        state="stale" if manifest else "missing",
    )


async def ensure_presentation_preview_manifest(
    sql_session: AsyncSession,
    presentation_id: uuid.UUID,
    request: Optional[Request] = None,
    *,
    auth_context: Optional[dict[str, dict[str, str]]] = None,
) -> PresentationPreviewManifest:
    lock = _preview_locks.setdefault(presentation_id, asyncio.Lock())
    async with lock:
        current = await get_presentation_preview_manifest(sql_session, presentation_id)
        if current.state == "ready":
            return current

        rendering = current.model_copy(
            update={"state": "rendering", "warnings": [], "updated_at": _now()}
        )
        _write_manifest(rendering)

        try:
            rendered_paths, render_warnings = await _render_previews_with_nextjs(
                presentation_id=presentation_id,
                revision=current.revision,
                expected_slide_count=len(current.slides),
                auth_context=(
                    auth_context
                    or extract_preview_auth_context(request)
                ),
            )
            if set(rendered_paths) != {item.index for item in current.slides}:
                raise RuntimeError("Preview renderer returned an incomplete slide set")

            updated_at = _now()
            ready_slides: list[SlidePreviewManifestItem] = []
            for slide in current.slides:
                filesystem_path = Path(rendered_paths[slide.index]).resolve()
                expected_directory = get_preview_directory(presentation_id)
                if filesystem_path.parent != expected_directory or not filesystem_path.is_file():
                    raise RuntimeError("Preview renderer returned an unsafe or missing file")
                ready_slides.append(
                    slide.model_copy(
                        update={
                            "path": (
                                f"/app_data/previews/{presentation_id}/"
                                f"{filesystem_path.name}"
                            ),
                            "updated_at": updated_at,
                        }
                    )
                )

            manifest = PresentationPreviewManifest(
                presentation_id=presentation_id,
                revision=current.revision,
                state="ready",
                slides=ready_slides,
                updated_at=updated_at,
                warnings=render_warnings,
            )
            _write_manifest(manifest)
            cleanup_warning = _remove_obsolete_preview_files(
                presentation_id,
                {Path(path).resolve() for path in rendered_paths.values()},
            )
            if cleanup_warning:
                manifest = manifest.model_copy(
                    update={"warnings": [*manifest.warnings, cleanup_warning]}
                )
                _write_manifest(manifest)
            return manifest
        except Exception as exc:
            failed = current.model_copy(
                update={
                    "state": "error",
                    "warnings": [str(exc)],
                    "updated_at": _now(),
                }
            )
            _write_manifest(failed)
            raise HTTPException(
                status_code=502,
                detail=f"Failed to render presentation previews: {exc}",
            ) from exc


async def _get_presentation_and_slides(
    sql_session: AsyncSession,
    presentation_id: uuid.UUID,
) -> tuple[PresentationModel, list[SlideModel]]:
    presentation = await sql_session.get(PresentationModel, presentation_id)
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")
    result = await sql_session.scalars(
        select(SlideModel)
        .where(SlideModel.presentation == presentation_id)
        .order_by(SlideModel.index)
    )
    return presentation, list(result)


def _empty_manifest(
    presentation_id: uuid.UUID,
    revision: str,
    slides: list[SlideModel],
    *,
    state: str,
    warnings: Optional[list[str]] = None,
) -> PresentationPreviewManifest:
    return PresentationPreviewManifest(
        presentation_id=presentation_id,
        revision=revision,
        state=state,
        slides=[
            SlidePreviewManifestItem(
                index=slide.index,
                title=derive_slide_preview_title(slide.content, slide.index),
                revision=revision,
            )
            for slide in slides
        ],
        warnings=warnings or [],
    )


def _manifest_path(presentation_id: uuid.UUID) -> Path:
    return get_preview_directory(presentation_id) / "manifest.json"


def _read_manifest(
    presentation_id: uuid.UUID,
) -> Optional[PresentationPreviewManifest]:
    path = _manifest_path(presentation_id)
    if not path.is_file():
        return None
    try:
        return PresentationPreviewManifest.model_validate_json(
            path.read_text(encoding="utf-8")
        )
    except (OSError, ValueError):
        return None


def _write_manifest(manifest: PresentationPreviewManifest) -> None:
    path = _manifest_path(manifest.presentation_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(".tmp")
    temporary_path.write_text(
        manifest.model_dump_json(indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(path)


def _manifest_files_are_ready(manifest: PresentationPreviewManifest) -> bool:
    if not manifest.slides:
        return False
    try:
        return all(
            bool(item.path)
            and resolve_preview_file_path(
                item.path or "",
                manifest.presentation_id,
            ).is_file()
            for item in manifest.slides
        )
    except ValueError:
        return False


async def _render_previews_with_nextjs(
    *,
    presentation_id: uuid.UUID,
    revision: str,
    expected_slide_count: int,
    auth_context: dict[str, dict[str, str]],
) -> tuple[dict[int, str], list[str]]:
    base_url = os.getenv("NEXTJS_API_URL", "http://localhost:3000").rstrip("/")
    headers = {"Content-Type": "application/json", **auth_context["headers"]}
    params = auth_context["params"]

    timeout = aiohttp.ClientTimeout(total=300)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(
            f"{base_url}/api/presentation-previews",
            params=params,
            headers=headers,
            json={
                "presentation_id": str(presentation_id),
                "revision": revision,
                "expected_slide_count": expected_slide_count,
            },
        ) as response:
            payload = await response.json(content_type=None)
            if response.status != 200:
                detail = payload.get("detail") if isinstance(payload, dict) else payload
                raise RuntimeError(f"Next.js preview renderer failed: {detail}")

    slides = payload.get("slides", []) if isinstance(payload, dict) else []
    rendered_paths = {
        int(item["index"]): str(item["filesystem_path"])
        for item in slides
        if isinstance(item, dict)
        and "index" in item
        and "filesystem_path" in item
    }
    warnings = payload.get("warnings", []) if isinstance(payload, dict) else []
    return rendered_paths, [str(item) for item in warnings if isinstance(item, str)]


def _remove_obsolete_preview_files(
    presentation_id: uuid.UUID,
    active_paths: set[Path],
) -> Optional[str]:
    preview_directory = get_preview_directory(presentation_id)
    try:
        for candidate in preview_directory.glob("slide-*.png"):
            resolved = candidate.resolve()
            if resolved.parent == preview_directory and resolved not in active_paths:
                candidate.unlink(missing_ok=True)
    except OSError as exc:
        return f"Failed to remove obsolete preview files: {exc}"
    return None


def extract_preview_auth_context(
    request: Optional[Request],
) -> dict[str, dict[str, str]]:
    headers: dict[str, str] = {}
    params: dict[str, str] = {}
    if request is None:
        return {"headers": headers, "params": params}

    for header_name in ("authorization", "x-api-key"):
        header_value = request.headers.get(header_name)
        if header_value:
            headers[header_name] = header_value

    token = request.query_params.get("token") or request.cookies.get("auth_token")
    api_key = request.query_params.get("api_key")
    if token:
        params["token"] = token
    if api_key:
        params["api_key"] = api_key
    return {"headers": headers, "params": params}


def _find_named_text(value: Any, target_key: str) -> Optional[str]:
    if isinstance(value, dict):
        direct = value.get(target_key)
        if isinstance(direct, str) and direct.strip():
            return direct.strip()
        for child in value.values():
            result = _find_named_text(child, target_key)
            if result:
                return result
    elif isinstance(value, list):
        for child in value:
            result = _find_named_text(child, target_key)
            if result:
                return result
    return None


def _now() -> datetime:
    return datetime.now(timezone.utc)
