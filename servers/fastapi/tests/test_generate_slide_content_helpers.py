from utils.llm_calls.generate_slide_content import inject_reference_image_source


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
