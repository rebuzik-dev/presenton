from uuid import uuid4

import pytest
from pydantic import ValidationError

from models.derive_regenerate import DeriveRegenerateRequest
from models.selected_generation import GenerateSelectedSlidesRequest


def test_selected_generation_requires_unique_in_range_indices():
    with pytest.raises(ValidationError):
        GenerateSelectedSlidesRequest(
            request_id=uuid4(),
            template="general",
            slides_markdown=[{"content": "One"}],
            slide_indices=[0, 0],
        )
    with pytest.raises(ValidationError):
        GenerateSelectedSlidesRequest(
            request_id=uuid4(),
            template="general",
            slides_markdown=[{"content": "One"}],
            slide_indices=[1],
        )


def test_derive_overrides_must_be_unique_and_selected():
    with pytest.raises(ValidationError):
        DeriveRegenerateRequest(
            request_id=uuid4(),
            slide_indices=[0],
            outline_overrides=[{"index": 1, "content": "Wrong scope"}],
        )
    request = DeriveRegenerateRequest(
        request_id=uuid4(),
        slide_indices=[2, 0],
        outline_overrides=[
            {"index": 2, "content": "Third"},
            {"index": 0, "content": "First"},
        ],
    )
    assert request.slide_indices == [0, 2]
    assert [item.index for item in request.outline_overrides] == [0, 2]
