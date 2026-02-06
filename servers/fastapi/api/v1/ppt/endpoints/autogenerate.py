
import asyncio
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from enums.webhook_event import WebhookEvent
from models.generate_presentation_request import GeneratePresentationRequest
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from services.concurrent_service import CONCURRENT_SERVICE
from services.database import get_async_session
from services.presentation_service import PresentationService
from services.webhook_service import WebhookService
from utils.get_layout_by_name import get_layout_by_name

AUTOGENERATE_ROUTER = APIRouter(prefix="/presentation", tags=["Autogenerate"])


@AUTOGENERATE_ROUTER.post("/generate", response_model=dict)
async def autogenerate_presentation(
    request: GeneratePresentationRequest,
    background_tasks: BackgroundTasks,
    sql_session: AsyncSession = Depends(get_async_session),
):
    """
    Orchestrate the entire presentation generation flow suitable for agents.
    It returns the presentation_id immediately and runs the generation in the background.
    """
    
    # 1. Validation (Basic)
    if request.n_slides < 1:
        raise HTTPException(status_code=400, detail="n_slides must be at least 1")

    # 2. Create Presentation
    presentation = await PresentationService.create_presentation(
        sql_session=sql_session,
        content=request.content,
        n_slides=request.n_slides,
        language=request.language,
        file_paths=request.files,
        tone=request.tone,
        verbosity=request.verbosity,
        instructions=request.instructions,
        include_table_of_contents=request.include_table_of_contents,
        include_title_slide=request.include_title_slide,
        web_search=request.web_search,
    )
    
    # 3. Create Async Status Record (for polling)
    # We use the existing model but adapted for this flow
    async_status = AsyncPresentationGenerationTaskModel(
        id=presentation.id,
        status="pending",
        message="Starting generation...",
        presentation_id=presentation.id,
    )
    sql_session.add(async_status)
    await sql_session.commit()

    # 4. Define background task
    async def run_autogeneration():
         # We need a new session for the background task
        async for session in get_async_session():
            try:
                # Re-fetch status to attach to new session
                status = await session.get(AsyncPresentationGenerationTaskModel, presentation.id)
                
                # A. Generate Outlines
                status.message = "Generating outlines..."
                status.status = "processing"
                session.add(status)
                await session.commit()
                
                await PresentationService.generate_outlines(session, presentation.id)
                
                # B. Prepare Structure
                status.message = "Preparing structure..."
                session.add(status)
                await session.commit()
                
                layout_model = await get_layout_by_name(request.template)
                await PresentationService.prepare_structure(
                    session, presentation.id, layout_model
                )
                
                # C. Run Full Pipeline (Content + Assets + Export)
                status.message = "Generating slides and assets..."
                session.add(status)
                await session.commit()
                
                await PresentationService.run_full_generation_pipeline(
                    session, 
                    presentation.id, 
                    async_status=status,
                    export_as=None
                )

            except Exception as e:
                 # Error handling is largely done inside run_full_generation_pipeline 
                 # but we catch top-level errors here for the earlier steps
                 print(f"Autogeneration failed: {e}")
                 # Ensure status is updated if not already
                 if status and status.status != "error":
                     status.status = "error"
                     status.message = str(e)
                     session.add(status)
                     await session.commit()

    # 5. Launch Background Task
    background_tasks.add_task(run_autogeneration)

    return {
        "presentation_id": str(presentation.id),
        "status": "pending",
        "message": "Generation started in background",
        "poll_url": f"/api/v1/ppt/presentation/status/{presentation.id}" # Assuming status endpoint exists or we rely on GET /presentation
    }
