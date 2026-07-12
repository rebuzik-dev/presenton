from pathlib import Path
from uuid import uuid4

import pytest

from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from services import presentation_preview_service as preview_service
from services.presentation_preview_service import (
    compute_presentation_preview_revision,
    derive_slide_preview_title,
    resolve_preview_file_path,
)


def _presentation():
    return PresentationModel(
        id=uuid4(),
        content="Preview test",
        n_slides=1,
        language="English",
        layout={"name": "general", "slides": []},
    )


def _slide(presentation_id, **overrides):
    data = {
        "presentation": presentation_id,
        "layout_group": "general",
        "layout": "general:hero",
        "index": 0,
        "content": {"title": "Original title", "body": "Original body"},
        "properties": {"colors": {"accent": "#fff"}},
    }
    data.update(overrides)
    return SlideModel(**data)


def test_preview_revision_is_stable_and_tracks_rendered_slide_inputs():
    presentation = _presentation()
    slide = _slide(presentation.id)

    first = compute_presentation_preview_revision(presentation, [slide])
    same = compute_presentation_preview_revision(presentation, [slide])
    changed_content = compute_presentation_preview_revision(
        presentation,
        [_slide(presentation.id, content={"title": "Changed"})],
    )
    changed_properties = compute_presentation_preview_revision(
        presentation,
        [_slide(presentation.id, properties={"colors": {"accent": "#000"}})],
    )

    assert first == same
    assert len(first) == 64
    assert first != changed_content
    assert first != changed_properties


def test_preview_revision_tracks_renderer_version(monkeypatch):
    presentation = _presentation()
    slide = _slide(presentation.id)
    original = compute_presentation_preview_revision(presentation, [slide])

    monkeypatch.setattr(
        preview_service,
        "PREVIEW_RENDERER_REVISION",
        "schema-media-next",
    )

    assert compute_presentation_preview_revision(presentation, [slide]) != original


def test_slide_preview_title_prefers_semantic_headings_and_has_fallback():
    assert derive_slide_preview_title({"body": {"heading": "Nested heading"}}, 1) == (
        "Nested heading"
    )
    assert derive_slide_preview_title({"body": "No heading"}, 2) == "Slide 3"


def test_preview_path_resolution_rejects_paths_outside_cache(tmp_path: Path):
    presentation_id = uuid4()
    valid_path = (
        tmp_path / "previews" / str(presentation_id) / "slide-0-deadbeef.png"
    )
    valid_path.parent.mkdir(parents=True)
    valid_path.touch()

    resolved = resolve_preview_file_path(
        f"/app_data/previews/{presentation_id}/{valid_path.name}",
        presentation_id,
        app_data_directory=str(tmp_path),
    )
    assert resolved == valid_path.resolve()

    with pytest.raises(ValueError):
        resolve_preview_file_path(
            "/app_data/exports/secret.png",
            presentation_id,
            app_data_directory=str(tmp_path),
        )


def test_obsolete_preview_cleanup_keeps_only_active_revision(tmp_path, monkeypatch):
    presentation_id = uuid4()
    preview_directory = tmp_path / "previews" / str(presentation_id)
    preview_directory.mkdir(parents=True)
    active = preview_directory / "slide-0-current.png"
    obsolete = preview_directory / "slide-0-obsolete.png"
    unrelated = preview_directory / "cover.png"
    for path in (active, obsolete, unrelated):
        path.touch()

    monkeypatch.setattr(
        preview_service,
        "get_preview_directory",
        lambda _presentation_id: preview_directory.resolve(),
    )

    warning = preview_service._remove_obsolete_preview_files(
        presentation_id,
        {active.resolve()},
    )

    assert warning is None
    assert active.exists()
    assert not obsolete.exists()
    assert unrelated.exists()
