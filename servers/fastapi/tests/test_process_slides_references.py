import uuid
import types
import sys
import asyncio
from unittest.mock import AsyncMock, MagicMock

from models.sql.slide import SlideModel


mock_icon_finder_module = types.SimpleNamespace(
    ICON_FINDER_SERVICE=types.SimpleNamespace(
        search_icons=AsyncMock(return_value=[]),
    )
)
sys.modules["services.icon_finder_service"] = mock_icon_finder_module

from utils.process_slides import process_slide_and_fetch_assets


def test_process_slide_passes_reference_images_to_image_prompt():
    image_generation_service = MagicMock()
    image_generation_service.generate_image = AsyncMock(
        return_value="/static/images/generated.png"
    )

    slide = SlideModel(
        presentation=uuid.uuid4(),
        layout_group="general",
        layout="hero",
        index=0,
        content={
            "image": {
                "__image_prompt__": "Modern office exterior",
                "__reference_image_source__": "https://example.com/reference.png",
            }
        },
        html_content=None,
        properties=None,
    )

    asyncio.run(process_slide_and_fetch_assets(image_generation_service, slide))

    image_prompt = image_generation_service.generate_image.await_args.args[0]
    assert image_prompt.reference_images == ["https://example.com/reference.png"]
    assert slide.content["image"]["__image_url__"] == "/static/images/generated.png"
