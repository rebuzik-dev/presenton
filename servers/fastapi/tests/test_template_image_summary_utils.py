from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from utils.template_image_summary import (
    build_layout_image_summary,
    count_image_prompt_slots,
    extract_slide_image_slots,
)


def test_count_single_image_slot():
    schema = {
        "type": "object",
        "properties": {
            "image": {
                "type": "object",
                "properties": {
                    "__image_prompt__": {"type": "string"},
                    "__image_url__": {"type": "string"},
                },
            }
        },
    }

    slots, approximate = count_image_prompt_slots(schema)
    assert slots == 1
    assert approximate is False


def test_count_image_slots_in_array_uses_max_items():
    schema = {
        "type": "object",
        "properties": {
            "teamMembers": {
                "type": "array",
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "properties": {
                        "image": {
                            "type": "object",
                            "properties": {"__image_prompt__": {"type": "string"}},
                        }
                    },
                },
            }
        },
    }

    slots, approximate = count_image_prompt_slots(schema)
    assert slots == 4
    assert approximate is False


def test_count_image_slots_in_unbounded_array_is_approximate():
    schema = {
        "type": "object",
        "properties": {
            "gallery": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"__image_prompt__": {"type": "string"}},
                },
            }
        },
    }

    slots, approximate = count_image_prompt_slots(schema)
    assert slots == 1
    assert approximate is True


def test_count_image_slots_with_defs_and_refs():
    schema = {
        "$defs": {
            "ImageSlot": {
                "type": "object",
                "properties": {"__image_prompt__": {"type": "string"}},
            }
        },
        "type": "object",
        "properties": {
            "hero": {"$ref": "#/$defs/ImageSlot"},
            "cards": {
                "type": "array",
                "maxItems": 2,
                "items": {"$ref": "#/$defs/ImageSlot"},
            },
        },
    }

    slots, approximate = count_image_prompt_slots(schema)
    assert slots == 3
    assert approximate is False


def test_extract_image_slots_expands_arrays_and_marks_placeholders():
    schema = {
        "type": "object",
        "properties": {
            "images": {
                "type": "array",
                "maxItems": 2,
                "items": {
                    "type": "object",
                    "properties": {"__image_prompt__": {"type": "string"}},
                },
            }
        },
    }

    slots = extract_slide_image_slots(
        schema,
        ["Moodboard image 1", "Premium table detail"],
        2,
    )

    assert slots == [
        {
            "slot_index": 0,
            "schema_path": "images[0].__image_prompt__",
            "default_hint": None,
            "is_placeholder": True,
        },
        {
            "slot_index": 1,
            "schema_path": "images[1].__image_prompt__",
            "default_hint": "Premium table detail",
            "is_placeholder": False,
        },
    ]


def test_build_layout_image_summary_contains_descriptions():
    layout = PresentationLayoutModel(
        name="general",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="hero-slide",
                name="Hero",
                description="Hero layout with one image",
                json_schema={
                    "title": "Hero Slide",
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "image": {
                            "type": "object",
                            "default": {
                                "__image_prompt__": "Hero visual prompt",
                            },
                            "properties": {"__image_prompt__": {"type": "string"}},
                        },
                    },
                },
            )
        ],
    )

    summary = build_layout_image_summary("general", layout)

    assert summary["template"] == "general"
    assert summary["total_image_prompt_slots"] == 1
    assert len(summary["slides"]) == 1
    assert "Hero layout with one image" in summary["slides"][0]["slide_description"]
    assert "Schema: Hero Slide" in summary["slides"][0]["slide_description"]
    assert summary["slides"][0]["image_prompts"] == ["Hero visual prompt"]
    assert summary["slides"][0]["image_slots"] == [
        {
            "slot_index": 0,
            "schema_path": "image.__image_prompt__",
            "default_hint": "Hero visual prompt",
            "is_placeholder": False,
        }
    ]


def test_build_layout_image_summary_prefers_concrete_prompt_defaults():
    layout = PresentationLayoutModel(
        name="general",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="gallery-slide",
                name="Gallery",
                description="Gallery layout",
                json_schema={
                    "type": "object",
                    "properties": {
                        "images": {
                            "type": "array",
                            "minItems": 2,
                            "maxItems": 2,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "__image_prompt__": {
                                        "type": "string",
                                        "default": "Generic gallery image",
                                    }
                                },
                            },
                            "default": [
                                {"__image_prompt__": "Gallery image A"},
                                {"__image_prompt__": "Gallery image B"},
                            ],
                        }
                    },
                },
            )
        ],
    )

    summary = build_layout_image_summary("general", layout)
    assert summary["slides"][0]["image_prompt_slots"] == 2
    assert summary["slides"][0]["image_prompts"] == [
        "Gallery image A",
        "Gallery image B",
    ]


def test_build_layout_image_summary_uses_source_prompts_when_schema_defaults_are_removed(
    tmp_path,
    monkeypatch,
):
    template_slug = "catering"
    template_dir = tmp_path / template_slug
    template_dir.mkdir(parents=True)
    (template_dir / "HeaderImageSlideLayout.tsx").write_text(
        """
const layoutId = "header-image-slide"
const sample = {
  image: {
    __image_prompt__: "Catering hero photo"
  }
}
        """.strip(),
        encoding="utf-8",
    )
    monkeypatch.setenv("NEXTJS_PRESENTATION_TEMPLATES_DIR", str(tmp_path))

    layout = PresentationLayoutModel(
        name=template_slug,
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="catering:header-image-slide",
                name="Header Image Slide",
                description="Header with one image",
                json_schema={
                    "type": "object",
                    "properties": {
                        "image": {
                            "type": "object",
                            "properties": {
                                "__image_prompt__": {"type": "string"},
                            },
                        }
                    },
                },
            )
        ],
    )

    summary = build_layout_image_summary(template_slug, layout)
    assert summary["slides"][0]["image_prompt_slots"] == 1
    assert summary["slides"][0]["image_prompts"] == ["Catering hero photo"]


def test_build_layout_image_summary_trims_source_prompts_to_slot_count(
    tmp_path,
    monkeypatch,
):
    template_slug = "catering"
    template_dir = tmp_path / template_slug
    template_dir.mkdir(parents=True)
    (template_dir / "HeaderImageSlideLayout.tsx").write_text(
        """
const layoutId = "header-image-slide"
const sample = {
  image: {
    __image_prompt__: "Generic image prompt"
  },
  imageDefaults: {
    __image_prompt__: "Specific catering hero photo"
  }
}
        """.strip(),
        encoding="utf-8",
    )
    monkeypatch.setenv("NEXTJS_PRESENTATION_TEMPLATES_DIR", str(tmp_path))

    layout = PresentationLayoutModel(
        name=template_slug,
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="catering:header-image-slide",
                name="Header Image Slide",
                description="Header with one image",
                json_schema={
                    "type": "object",
                    "properties": {
                        "image": {
                            "type": "object",
                            "properties": {
                                "__image_prompt__": {"type": "string"},
                            },
                        }
                    },
                },
            )
        ],
    )

    summary = build_layout_image_summary(template_slug, layout)
    assert summary["slides"][0]["image_prompt_slots"] == 1
    assert summary["slides"][0]["image_prompts"] == ["Specific catering hero photo"]
