from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from utils.template_schema_summary import build_template_schema_summary


def test_build_template_schema_summary_extracts_content_fields_and_slots():
    schema = {
        "title": "Header Color Cards Image Slide",
        "type": "object",
        "required": ["title", "colorCards"],
        "properties": {
            "title": {
                "type": "string",
                "minLength": 3,
                "maxLength": 80,
                "description": "Main slide title",
            },
            "primaryTitle": {"type": "string"},
            "secondaryTitle": {"type": "string"},
            "colorCards": {
                "type": "array",
                "minItems": 4,
                "maxItems": 8,
                "items": {
                    "type": "object",
                    "required": ["hex", "description", "group"],
                    "properties": {
                        "hex": {
                            "type": "string",
                            "minLength": 6,
                            "maxLength": 9,
                            "description": "Hex color",
                        },
                        "description": {"type": "string"},
                        "group": {"type": "string", "enum": ["primary", "secondary"]},
                    },
                },
            },
            "image": {
                "type": "object",
                "properties": {
                    "__image_url__": {"type": "string"},
                    "__image_prompt__": {"type": "string"},
                },
            },
        },
    }

    layout = PresentationLayoutModel(
        name="catering",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="catering:header-color-cards-image-slide",
                name="Header Color Cards Image Slide",
                description="Palette and visual moodboard",
                json_schema=schema,
            )
        ],
    )

    summary = build_template_schema_summary(
        "catering",
        layout,
        [{"name": "HeaderColorCardsImageSlideLayout", "file": "HeaderColorCardsImageSlideLayout.tsx"}],
    )

    assert summary["template"] == "catering"
    assert summary["layout_count"] == 1

    slide = summary["layouts"][0]
    assert slide["layout_id"] == "catering:header-color-cards-image-slide"
    assert slide["content_slots"]["image_slots"] == 1
    assert slide["content_slots"]["icon_slots"] == 0
    assert slide["source_file"] == "HeaderColorCardsImageSlideLayout.tsx"

    array_slots = slide["content_slots"]["array_slots"]
    assert any(
        slot["path"] == "colorCards[]" and slot["min_items"] == 4 and slot["max_items"] == 8
        for slot in array_slots
    )

    fields = {item["path"]: item for item in slide["fields_summary"]}
    assert "colorCards[].hex" in fields
    assert fields["colorCards[].hex"]["type"] == "string"
    assert fields["colorCards[].hex"]["constraints"]["minLength"] == 6
    assert fields["colorCards[].group"]["enum_values"] == ["primary", "secondary"]
    assert fields["image.__image_prompt__"]["special_kind"] == "image_prompt"


def test_build_template_schema_summary_handles_local_refs():
    schema = {
        "$defs": {
            "ImageSchema": {
                "type": "object",
                "properties": {
                    "__image_url__": {"type": "string"},
                    "__image_prompt__": {"type": "string"},
                },
            }
        },
        "type": "object",
        "properties": {
            "heroImage": {"$ref": "#/$defs/ImageSchema"},
        },
    }

    layout = PresentationLayoutModel(
        name="general",
        ordered=False,
        slides=[
            SlideLayoutModel(
                id="general:hero",
                name="Hero",
                description="Hero layout",
                json_schema=schema,
            )
        ],
    )

    summary = build_template_schema_summary("general", layout, None)
    slide = summary["layouts"][0]
    assert slide["content_slots"]["image_slots"] == 1
    assert "heroImage.__image_prompt__" in {
        field["path"] for field in slide["fields_summary"]
    }
