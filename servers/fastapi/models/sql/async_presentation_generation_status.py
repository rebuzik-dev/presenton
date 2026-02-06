from datetime import datetime
import secrets
from typing import Optional
import uuid

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


from db.types.guid import GUID


class AsyncPresentationGenerationTaskModel(SQLModel, table=True):

    __tablename__ = "async_presentation_generation_tasks"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(GUID, primary_key=True),
    )
    status: str
    message: Optional[str] = None
    presentation_id: Optional[uuid.UUID] = Field(default=None, sa_column=Column(GUID))
    error: Optional[dict] = Field(sa_column=Column(JSON), default=None)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    data: Optional[dict] = Field(sa_column=Column(JSON), default=None)
