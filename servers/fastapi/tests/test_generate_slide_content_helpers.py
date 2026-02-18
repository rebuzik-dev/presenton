from utils.llm_calls.generate_slide_content import (
    inject_reference_image_source,
    inject_slide_style_metadata,
)


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
