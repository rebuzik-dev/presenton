from __future__ import annotations

from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import re
from types import SimpleNamespace
from unittest.mock import patch
import uuid

import sqlalchemy as sa

from utils.template_prompt_overrides import build_prompt_profile_revision
from utils.universal_template_prompt_profiles import (
    LEGACY_CATERING_FLAG_RULE,
    UNIVERSAL_TEMPLATE_PROMPTS,
    merge_universal_prompt_profile,
)


TEMPLATES_ROOT = (
    Path(__file__).resolve().parents[2] / "nextjs" / "presentation-templates"
)
TEMPLATE_SLUGS = tuple(UNIVERSAL_TEMPLATE_PROMPTS)


def _template_source(template_slug: str) -> str:
    template_dir = TEMPLATES_ROOT / template_slug
    parts = [
        path.read_text(encoding="utf-8")
        for path in sorted(template_dir.glob("*.tsx"))
    ]
    parts.append((template_dir / "settings.json").read_text(encoding="utf-8"))
    return "\n".join(parts)


def _image_prompt_literals(path: Path) -> list[str]:
    source = path.read_text(encoding="utf-8")
    return re.findall(r'__image_prompt__\s*:\s*"([^"]+)"', source)


def test_template_sources_do_not_contain_known_domain_or_event_leaks():
    forbidden_by_template = {
        "catering": (
            "business forum",
            "деловой форум",
            "200 человек",
            "700 г",
            "400 г",
            "russian flag",
            "российского флага",
        ),
        "souvenir": (
            "candle",
            "свеч",
            "floristic",
            "флорист",
            "table setting",
            "сервировк",
            "brooch",
            "брош",
            "cosmetic",
            "космет",
            "notebook",
            "блокнот",
            "invitation",
            "приглашен",
        ),
        "video": (
            "it-профи",
            "it specialist",
            "разработчик",
            "строка кода",
            "300 профессион",
            "500+",
            "2026",
            "16.03",
            "0:00",
            "1:20",
            "2:40",
            "5:15",
            "catering",
        ),
        "decor-floristics-template": (
            "8 march",
            "8 марта",
            "mimosa",
            "мимоз",
            "skolkovo",
            "сколково",
            "women's day",
        ),
    }

    for template_slug, forbidden_values in forbidden_by_template.items():
        source = _template_source(template_slug).casefold()
        for forbidden in forbidden_values:
            assert forbidden.casefold() not in source, (
                f"{template_slug} still contains event-specific prompt leakage: "
                f"{forbidden}"
            )


def test_template_sources_do_not_expose_technical_image_placeholders():
    forbidden_placeholders = (
        "Moodboard image",
        "Product photo",
        "Overview photo",
        "Generate exactly",
        "Layout intent",
    )

    for template_slug in TEMPLATE_SLUGS:
        source = _template_source(template_slug).casefold()
        for placeholder in forbidden_placeholders:
            assert placeholder.casefold() not in source


def test_settings_and_layouts_express_the_expected_semantic_roles():
    expected_roles = {
        "catering": {
            "CoverKickerTitleSlideLayout.tsx": "обложк",
            "HeaderQuoteTwoColumnsSlideLayout.tsx": "концепц",
            "HeaderColorCardsImageSlideLayout.tsx": "палитр",
            "HeaderImageFactsListSlideLayout.tsx": "параметр",
            "HeaderTextBulletsImageSlideLayout.tsx": "меню",
            "HeaderThreeImageCardsSlideLayout.tsx": "решен",
            "HeaderMoodboardCollageSlideLayout.tsx": "четырёхкадров",
        },
        "souvenir": {
            "HeaderQuoteTwoColumnsLinesSlideLayout.tsx": "концепц",
            "PaletteGridImageSlideLayout.tsx": "палитр",
            "TypographyTwoColumnsImageSlideLayout.tsx": "типограф",
            "MoodboardCollage4SlideLayout.tsx": "четырёхкадров",
            "HeaderParagraphPatternImageSlideLayout.tsx": "паттерн",
            "DesignElementsMultiColumnSlideLayout.tsx": "материал",
            "ProposalsThreeImagesSlideLayout.tsx": "предложен",
            "ProposalsCollageLeftRightStackSlideLayout.tsx": "упаков",
        },
        "video": {
            "TitleEventHeaderSlideLayout.tsx": "обложк",
            "ConceptMissionMoodSlideLayout.tsx": "тональност",
            "ColorPaletteListingSlideLayout.tsx": "палитр",
            "TypographySpecSlideLayout.tsx": "типограф",
            "StoryboardFrameDescriptionSlideLayout.tsx": "хук",
            "StoryboardSplitVisualSlideLayout.tsx": "развит",
            "StoryboardEventPointSlideLayout.tsx": "ключев",
            "StoryboardClimaxSlideLayout.tsx": "кульминац",
        },
        "decor-floristics-template": {
            "DecorCoverTitleSlideLayout.tsx": "обложк",
            "DecorConceptMissionKeyIdeasSlideLayout.tsx": "концепц",
            "DecorColorPaletteSlideLayout.tsx": "палитр",
            "DecorTypographySlideLayout.tsx": "типограф",
            "StageDesignProposalsSlideLayout.tsx": "сцен",
            "PhotozoneDesignProposalsSlideLayout.tsx": "фотозон",
        },
    }

    for template_slug, files in expected_roles.items():
        settings = json.loads(
            (TEMPLATES_ROOT / template_slug / "settings.json").read_text(
                encoding="utf-8"
            )
        )
        assert "бриф" in settings["description"].casefold()
        for filename, expected_keyword in files.items():
            source = (TEMPLATES_ROOT / template_slug / filename).read_text(
                encoding="utf-8"
            )
            assert expected_keyword in source.casefold(), (
                f"{template_slug}/{filename} has lost its semantic role"
            )


def test_multi_image_layouts_have_distinct_semantic_image_hints():
    layouts = {
        ("catering", "HeaderMoodboardCollageSlideLayout.tsx"): 4,
        ("souvenir", "MoodboardCollage4SlideLayout.tsx"): 4,
        ("video", "StoryboardFrameDescriptionSlideLayout.tsx"): 2,
        ("video", "StoryboardSplitVisualSlideLayout.tsx"): 2,
        ("video", "StoryboardEventPointSlideLayout.tsx"): 2,
        ("video", "StoryboardClimaxSlideLayout.tsx"): 2,
        ("decor-floristics-template", "StageDesignProposalsSlideLayout.tsx"): 2,
        ("decor-floristics-template", "PhotozoneDesignProposalsSlideLayout.tsx"): 2,
    }

    for (template_slug, filename), expected_slots in layouts.items():
        prompts = _image_prompt_literals(TEMPLATES_ROOT / template_slug / filename)
        assert len(set(prompts)) >= expected_slots
        assert not any(
            re.fullmatch(
                r"(?:moodboard image|product photo|overview photo)(?: \d+)?",
                prompt.strip(),
                flags=re.IGNORECASE,
            )
            for prompt in prompts
        )


def test_profile_seed_fills_only_blank_prompt_and_preserves_custom_overrides():
    layout_prompts = {
        "cover": {
            "layout_prompt": "Пользовательская композиция",
            "field_prompts": {"title": "Пользовательский заголовок"},
            "image_prompt_overrides": {"image": "Пользовательский кадр"},
        }
    }

    template_prompt, merged_layouts, changed = merge_universal_prompt_profile(
        template_slug="souvenir",
        template_prompt="   ",
        layout_prompts=layout_prompts,
    )

    assert template_prompt == UNIVERSAL_TEMPLATE_PROMPTS["souvenir"]
    assert merged_layouts == layout_prompts
    assert changed is True

    custom_prompt, custom_layouts, custom_changed = merge_universal_prompt_profile(
        template_slug="souvenir",
        template_prompt="Моя пользовательская политика",
        layout_prompts=layout_prompts,
    )
    assert custom_prompt == "Моя пользовательская политика"
    assert custom_layouts == layout_prompts
    assert custom_changed is False


def test_profile_seed_removes_only_exact_catering_draft_rule():
    layout_prompts = {
        "cover": {
            "layout_prompt": LEGACY_CATERING_FLAG_RULE,
            "field_prompts": {"title": "Сохранить заголовок"},
            "image_prompt_overrides": {"image": "Сохранить изображение"},
        },
        "menu": {"layout_prompt": f"{LEGACY_CATERING_FLAG_RULE} Дополнение"},
        "custom": {"layout_prompt": "Сохранить пользовательскую композицию"},
    }

    _, merged_layouts, changed = merge_universal_prompt_profile(
        template_slug="catering",
        template_prompt="Пользовательская политика",
        layout_prompts=layout_prompts,
    )

    assert changed is True
    assert merged_layouts["cover"] == {
        "field_prompts": {"title": "Сохранить заголовок"},
        "image_prompt_overrides": {"image": "Сохранить изображение"},
    }
    assert merged_layouts["menu"]["layout_prompt"].endswith("Дополнение")
    assert merged_layouts["custom"] == layout_prompts["custom"]


def test_seeded_policy_changes_prompt_revision():
    before = SimpleNamespace(
        is_active=True,
        template_prompt=None,
        layout_prompts={},
        updated_at=None,
    )
    template_prompt, layout_prompts, changed = merge_universal_prompt_profile(
        template_slug="video",
        template_prompt=before.template_prompt,
        layout_prompts=before.layout_prompts,
    )
    after = SimpleNamespace(
        is_active=True,
        template_prompt=template_prompt,
        layout_prompts=layout_prompts,
        updated_at=datetime.now(timezone.utc),
    )

    assert changed is True
    assert (
        build_prompt_profile_revision(before)["fingerprint"]
        != build_prompt_profile_revision(after)["fingerprint"]
    )


def test_data_migration_seeds_missing_profiles_and_preserves_existing_values():
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "8b2f1d6c4e9a_seed_universal_template_prompt_profiles.py"
    )
    spec = importlib.util.spec_from_file_location("universal_prompt_seed", migration_path)
    assert spec and spec.loader
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)

    metadata = sa.MetaData()
    profiles = sa.Table(
        "template_prompt_profiles",
        metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("template_slug", sa.String(), unique=True, nullable=False),
        sa.Column("template_id", sa.Uuid()),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("template_prompt", sa.String()),
        sa.Column("layout_prompts", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_id", sa.Uuid()),
    )
    engine = sa.create_engine("sqlite:///:memory:")
    metadata.create_all(engine)
    original_updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)

    with engine.begin() as connection:
        connection.execute(
            profiles.insert(),
            [
                {
                    "id": uuid.uuid4(),
                    "template_slug": "catering",
                    "template_id": None,
                    "is_active": True,
                    "template_prompt": "",
                    "layout_prompts": {
                        "cover": {
                            "layout_prompt": LEGACY_CATERING_FLAG_RULE,
                            "field_prompts": {"title": "Сохранить"},
                        }
                    },
                    "created_at": original_updated_at,
                    "updated_at": original_updated_at,
                    "created_by_id": None,
                },
                {
                    "id": uuid.uuid4(),
                    "template_slug": "souvenir",
                    "template_id": None,
                    "is_active": True,
                    "template_prompt": "Пользовательская политика",
                    "layout_prompts": {"custom": {"layout_prompt": "Сохранить"}},
                    "created_at": original_updated_at,
                    "updated_at": original_updated_at,
                    "created_by_id": None,
                },
            ],
        )
        with patch.object(migration.op, "get_bind", return_value=connection):
            migration.upgrade()

        rows = {
            row.template_slug: row
            for row in connection.execute(sa.select(profiles)).mappings()
        }

    assert set(rows) == set(TEMPLATE_SLUGS)
    assert rows["catering"].template_prompt == UNIVERSAL_TEMPLATE_PROMPTS["catering"]
    assert rows["catering"].layout_prompts == {
        "cover": {"field_prompts": {"title": "Сохранить"}}
    }
    assert rows["souvenir"].template_prompt == "Пользовательская политика"
    assert rows["souvenir"].layout_prompts == {
        "custom": {"layout_prompt": "Сохранить"}
    }
