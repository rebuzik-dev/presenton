from models.presentation_outline_model import SlideOutlineModel
from utils.get_dynamic_models import get_presentation_outline_model_with_n_slides
from utils.schema_utils import (
    decode_json_string_object_fields,
    normalize_openai_compatible_json_schema,
)


def _has_open_ended_object_schema(node):
    if isinstance(node, dict):
        if (
            node.get("type") == "object"
            and node.get("additionalProperties") is True
            and not node.get("properties")
        ):
            return True
        return any(_has_open_ended_object_schema(value) for value in node.values())
    if isinstance(node, list):
        return any(_has_open_ended_object_schema(value) for value in node)
    return False


def test_normalize_openai_schema_stringifies_open_ended_objects():
    schema = {
        "type": "object",
        "properties": {
            "style": {
                "anyOf": [
                    {
                        "type": "object",
                        "additionalProperties": True,
                    },
                    {"type": "null"},
                ]
            }
        },
    }

    normalized, field_paths = normalize_openai_compatible_json_schema(
        schema,
        strict=True,
    )

    assert ("style",) in field_paths
    assert normalized["properties"]["style"]["anyOf"][0]["type"] == "string"
    assert not _has_open_ended_object_schema(normalized)


def test_decode_json_string_object_fields_restores_dict_values():
    data = {
        "style": '{"slide": {"colors": {"background": "#FFFFFF"}}}',
    }

    decoded = decode_json_string_object_fields(data, [("style",)])

    assert decoded["style"]["slide"]["colors"]["background"] == "#FFFFFF"


def test_slide_outline_model_parses_stringified_style_payload():
    slide_outline = SlideOutlineModel(
        content="## Slide 1\nStyled",
        style='{"slide": {"colors": {"background": "#FFFFFF"}}}',
    )

    assert slide_outline.style is not None
    assert slide_outline.style["slide"]["colors"]["background"] == "#FFFFFF"


def test_slide_outline_model_drops_invalid_stringified_style_payload():
    slide_outline = SlideOutlineModel(
        content="## Slide 1\nStyled",
        style="{invalid json}",
    )

    assert slide_outline.style is None


def test_outline_llm_schema_avoids_open_ended_object_fields():
    response_model = get_presentation_outline_model_with_n_slides(3)
    schema = response_model.model_json_schema()
    normalized, field_paths = normalize_openai_compatible_json_schema(
        schema,
        strict=True,
    )

    assert not _has_open_ended_object_schema(normalized)
    assert field_paths == []
