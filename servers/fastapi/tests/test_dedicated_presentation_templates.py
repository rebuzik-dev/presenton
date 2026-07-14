from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import sqlalchemy as sa


FASTAPI_ROOT = Path(__file__).resolve().parents[1]
NEXTJS_ROOT = FASTAPI_ROOT.parent / "nextjs"
TEMPLATES_ROOT = NEXTJS_ROOT / "presentation-templates"
DEDICATED_SLUGS = (
    "catering-concept",
    "visual-code-overview",
    "decor-concept",
    "floristry-concept",
    "gift-set-concept",
    "souvenir-concept",
    "video-content-concept",
)


def test_dedicated_templates_are_registered_and_independent() -> None:
    registry = (NEXTJS_ROOT / "app" / "presentation-templates" / "dedicatedFileTemplates.tsx").read_text(
        encoding="utf-8"
    )
    for slug in DEDICATED_SLUGS:
        template_dir = TEMPLATES_ROOT / slug
        settings = json.loads((template_dir / "settings.json").read_text(encoding="utf-8"))
        assert settings["ordered"] is True
        assert settings["layoutOrder"]
        assert slug in registry
        for layout_file in settings["layoutOrder"]:
            filename = layout_file if layout_file.endswith(".tsx") else f"{layout_file}.tsx"
            assert (template_dir / filename).is_file()

    visual_code_text = _template_text("visual-code-overview").lower()
    floristry_text = _template_text("floristry-concept").lower()
    gift_set_text = _template_text("gift-set-concept").lower()

    assert "кейтер" not in visual_code_text
    assert "меню" not in visual_code_text
    assert "флорист" in floristry_text
    assert "декор" not in floristry_text
    assert "подарочн" in gift_set_text
    assert "сувенир" not in gift_set_text
    assert _template_text("decor-concept") != _template_text("floristry-concept")
    assert _template_text("gift-set-concept") != _template_text("souvenir-concept")


def test_dedicated_profile_migration_seeds_clean_baselines(monkeypatch) -> None:
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    profiles = sa.Table(
        "template_prompt_profiles",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("template_slug", sa.String(), unique=True),
        sa.Column("template_id", sa.Uuid()),
        sa.Column("is_active", sa.Boolean()),
        sa.Column("template_prompt", sa.String()),
        sa.Column("layout_prompts", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.Column("created_by_id", sa.Uuid()),
    )
    revisions = sa.Table(
        "template_prompt_profile_revisions",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("template_slug", sa.String()),
        sa.Column("version", sa.Integer()),
        sa.Column("fingerprint", sa.String()),
        sa.Column("is_active", sa.Boolean()),
        sa.Column("template_prompt", sa.String()),
        sa.Column("layout_prompts", sa.JSON()),
        sa.Column("action", sa.String()),
        sa.Column("changes", sa.JSON()),
        sa.Column("restored_from_revision_id", sa.Uuid()),
        sa.Column("created_by_id", sa.Uuid()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    metadata.create_all(engine)

    migration_path = (
        FASTAPI_ROOT
        / "alembic"
        / "versions"
        / "a4c7e2f9b1d6_seed_dedicated_template_prompt_profiles.py"
    )
    spec = importlib.util.spec_from_file_location("dedicated_template_profile_migration", migration_path)
    assert spec and spec.loader
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    with engine.begin() as connection:
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)
        migration.upgrade()
        profile_rows = connection.execute(sa.select(profiles)).mappings().all()
        revision_rows = connection.execute(sa.select(revisions)).mappings().all()

    assert {row["template_slug"] for row in profile_rows} == set(DEDICATED_SLUGS)
    assert {row["template_slug"] for row in revision_rows} == set(DEDICATED_SLUGS)
    assert all(row["template_prompt"] is None and row["layout_prompts"] == {} for row in profile_rows)
    assert all(row["action"] == "baseline" and row["version"] == 1 for row in revision_rows)


def _template_text(slug: str) -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted((TEMPLATES_ROOT / slug).glob("*.tsx"))
    )
