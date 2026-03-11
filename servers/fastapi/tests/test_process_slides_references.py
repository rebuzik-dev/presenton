import uuid
import types
import sys
import asyncio
from unittest.mock import AsyncMock, MagicMock

import dirtyjson
from sqlalchemy import inspect
from sqlmodel import Session, SQLModel, create_engine

from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel


mock_icon_finder_module = types.SimpleNamespace(
    ICON_FINDER_SERVICE=types.SimpleNamespace(
        search_icons=AsyncMock(return_value=[]),
    )
)
sys.modules["services.icon_finder_service"] = mock_icon_finder_module

from utils.process_slides import (
    process_slide_add_placeholder_assets,
    process_slide_and_fetch_assets,
)


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


def test_process_slide_marks_json_content_dirty_and_persists_image_url():
    image_generation_service = MagicMock()
    image_generation_service.generate_image = AsyncMock(
        return_value="/app_data/images/generated-slide.png"
    )

    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(
        engine,
        tables=[PresentationModel.__table__, SlideModel.__table__],
    )

    with Session(engine) as session:
        presentation_id = uuid.uuid4()
        session.add(
            PresentationModel(
                id=presentation_id,
                content="test content",
                n_slides=1,
                language="en",
            )
        )
        session.commit()

        slide = SlideModel(
            presentation=presentation_id,
            layout_group="general",
            layout="hero",
            index=0,
            content={
                "image": {
                    "__image_prompt__": "Modern office exterior",
                    "__image_url__": "/static/images/placeholder.jpg",
                }
            },
            html_content=None,
            properties=None,
        )
        session.add(slide)
        session.commit()
        session.refresh(slide)

        original_content = slide.content

        asyncio.run(process_slide_and_fetch_assets(image_generation_service, slide))

        assert slide.content is not original_content
        assert inspect(slide).attrs.content.history.has_changes()

        session.add(slide)
        session.commit()
        session.refresh(slide)

        assert slide.content["image"]["__image_url__"] == "/app_data/images/generated-slide.png"


def test_process_slide_placeholder_handles_dirtyjson_attributed_dict():
    raw_content = dirtyjson.loads(
        """
        {
            image: {
                "__image_prompt__": "Modern office exterior"
            }
        }
        """
    )
    slide = SlideModel(
        presentation=uuid.uuid4(),
        layout_group="general",
        layout="hero",
        index=0,
        content=raw_content,
        html_content=None,
        properties=None,
    )

    process_slide_add_placeholder_assets(slide)

    assert isinstance(slide.content, dict)
    assert slide.content["image"]["__image_url__"] == "/static/images/placeholder.jpg"
