from models.presentation_outline_model import (
    PresentationImageStyle,
    PresentationOutlineModel,
    SlideImageBrief,
    SlideOutlineModel,
)
from services.partial_deck_service import build_outline_hashes
from utils.llm_calls.generate_slide_content import (
    _compiled_prompt_validation_error,
    _structured_image_guidance,
    inject_reference_image_source,
    inject_slide_style_metadata,
)


def _outline_with_briefs() -> SlideOutlineModel:
    return SlideOutlineModel(
        content="## Сервировка\n- Детали",
        image_briefs=[
            SlideImageBrief(slot_index=0, label="Общий план", prompt="Общий план фуршетной зоны"),
            SlideImageBrief(slot_index=1, label="Деталь", prompt="Деталь премиальной сервировки"),
        ],
    )


def test_structured_guidance_keeps_russian_briefs_separate():
    guidance, structured = _structured_image_guidance(_outline_with_briefs(), None)

    assert structured is True
    assert '"slot_index": 0' in guidance
    assert "Общий план фуршетной зоны" in guidance


def test_compiled_prompt_validation_accepts_distinct_english_slots():
    error = _compiled_prompt_validation_error(
        {
            "images": [
                {"__image_prompt__": "Wide view of an elegant pre-match buffet"},
                {"__image_prompt__": "Close-up of premium tableware and linen"},
            ]
        },
        _outline_with_briefs(),
    )

    assert error is None


def test_compiled_prompt_validation_rejects_untranslated_or_technical_prompt():
    error = _compiled_prompt_validation_error(
        {
            "images": [
                {"__image_prompt__": "Общий план фуршетной зоны"},
                {"__image_prompt__": "Layout intent: premium detail #C6A75E"},
            ]
        },
        _outline_with_briefs(),
    )

    assert error == (
        "image_prompt_compile_failed",
        "Image slot 0 was not compiled to a clean English provider prompt.",
    )


def test_outline_hash_changes_when_shared_image_style_changes():
    slide = _outline_with_briefs()
    editorial = PresentationOutlineModel(
        slides=[slide],
        image_style=PresentationImageStyle(style="editorial"),
    )
    documentary = PresentationOutlineModel(
        slides=[slide],
        image_style=PresentationImageStyle(style="documentary"),
    )

    assert build_outline_hashes(editorial) != build_outline_hashes(documentary)


def test_inject_reference_image_source_applies_to_all_image_nodes():
    slide_content = {
        "title": "Team",
        "heroImage": {
            "__image_prompt__": "Team on stage",
        },
        "members": [
            {
                "name": "Alice",
                "avatar": {"__image_prompt__": "CEO portrait"},
            },
            {
                "name": "Bob",
                "avatar": {"__image_prompt__": "CTO portrait"},
            },
        ],
    }

    result = inject_reference_image_source(
        slide_content,
        "https://example.com/reference-style.png",
    )

    assert result["heroImage"]["__reference_image_source__"] == "https://example.com/reference-style.png"
    assert result["members"][0]["avatar"]["__reference_image_source__"] == "https://example.com/reference-style.png"
    assert result["members"][1]["avatar"]["__reference_image_source__"] == "https://example.com/reference-style.png"


def test_inject_slide_style_metadata_sets_top_level_style():
    slide_content = {
        "title": "Styled",
        "heroImage": {
            "__image_prompt__": "Team on stage",
        },
    }
    style_payload = {
        "slide": {
            "colors": {"text_primary": "#3F3F3F"},
            "fonts": {"display": "Inter"},
        },
        "blocks": {
            "title": {"color": "#111111", "font": "display"},
        },
    }

    result = inject_slide_style_metadata(slide_content, style_payload)

    assert result["__style__"] == style_payload
    assert result["heroImage"]["__image_prompt__"] == "Team on stage"
