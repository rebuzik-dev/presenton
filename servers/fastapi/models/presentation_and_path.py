from pydantic import BaseModel
import uuid


from typing import Optional

class PresentationAndPath(BaseModel):
    presentation_id: uuid.UUID
    path: Optional[str] = None


class PresentationPathAndEditPath(PresentationAndPath):
    edit_path: str
