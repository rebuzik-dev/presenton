from models.generate_presentation_request import GeneratePresentationRequest


def test_slides_markdown_legacy_string_list_is_normalized():
    request = GeneratePresentationRequest(
        content="Presentation content",
        slides_markdown=[
            "## Slide 1\nLegacy markdown",
            "## Slide 2\nAnother markdown",
        ],
    )

    normalized = request.normalized_slides_markdown()

    assert normalized is not None
    assert len(normalized) == 2
    assert normalized[0].content == "## Slide 1\nLegacy markdown"
    assert normalized[0].image_prompt is None
    assert normalized[0].reference_image_source is None


def test_slides_markdown_object_and_string_mix_is_normalized():
    request = GeneratePresentationRequest(
        content="Presentation content",
        slides_markdown=[
            {
                "content": "## Slide 1\nIntro",
                "image_prompt": "Modern office lobby, warm light",
            },
            "## Slide 2\nLegacy format",
        ],
        global_reference_image_source="https://example.com/brand-style.png",
    )

    normalized = request.normalized_slides_markdown()

    assert normalized is not None
    assert len(normalized) == 2
    assert normalized[0].content == "## Slide 1\nIntro"
    assert normalized[0].image_prompt == "Modern office lobby, warm light"
    assert normalized[1].content == "## Slide 2\nLegacy format"
    assert request.global_reference_image_source == "https://example.com/brand-style.png"
