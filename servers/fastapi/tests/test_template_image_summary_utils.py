from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from utils.template_image_summary import (
    build_layout_image_summary,
    count_image_prompt_slots,
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
