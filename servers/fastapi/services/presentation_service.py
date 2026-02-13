
import asyncio
import json
import math
import random
import traceback
import uuid
from datetime import datetime
from urllib.parse import quote_plus
from typing import List, Optional

import dirtyjson
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from constants.presentation import DEFAULT_TEMPLATES
from enums.tone import Tone
from enums.verbosity import Verbosity
from enums.webhook_event import WebhookEvent
from models.api_error_model import APIErrorModel
from models.presentation_and_path import PresentationPathAndEditPath
from models.presentation_layout import PresentationLayoutModel
from models.presentation_outline_model import (
    PresentationOutlineModel,
    SlideOutlineModel,
)
from models.presentation_structure_model import PresentationStructureModel
from models.presentation_with_slides import PresentationWithSlides
from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from models.sql.template import TemplateModel
from services.concurrent_service import CONCURRENT_SERVICE
from services.documents_loader import DocumentsLoader
from services.image_generation_service import ImageGenerationService
from services.temp_file_service import TEMP_FILE_SERVICE
from services.webhook_service import WebhookService
from utils.asset_directory_utils import get_exports_directory, get_images_directory
from utils.export_utils import export_presentation
from utils.get_layout_by_name import get_layout_by_name
from utils.json_repair import repair_json_string
from utils.llm_calls.generate_presentation_outlines import generate_ppt_outline
from utils.llm_calls.generate_presentation_structure import (
    generate_presentation_structure,
)
from utils.llm_calls.generate_slide_content import (
    get_slide_content_from_type_and_outline,
)
from utils.ppt_utils import (
    get_presentation_title_from_outlines,
    select_toc_or_list_slide_layout_index,
)
from utils.process_slides import (
    process_slide_add_placeholder_assets,
    process_slide_and_fetch_assets,
)
from utils.custom_logger import setup_logger

logger = setup_logger(__name__)


class PresentationService:
    @staticmethod
    async def create_presentation(
        sql_session: AsyncSession,
        content: str,
        n_slides: int,
        language: str,
        file_paths: Optional[List[str]] = None,
        tone: Tone = Tone.DEFAULT,
        verbosity: Verbosity = Verbosity.STANDARD,
        instructions: Optional[str] = None,
        include_table_of_contents: bool = False,
        include_title_slide: bool = True,
        web_search: bool = False,
        template_font: Optional[str] = None,
    ) -> PresentationModel:
        logger.info(f"Creating presentation with content length: {len(content)}")
        if include_table_of_contents and n_slides < 3:
            raise HTTPException(
                status_code=400,
                detail="Number of slides cannot be less than 3 if table of contents is included",
            )

        presentation_id = uuid.uuid4()

        presentation = PresentationModel(
            id=presentation_id,
            content=content,
            n_slides=n_slides,
            language=language,
            file_paths=file_paths,
            tone=tone.value,
            verbosity=verbosity.value,
            instructions=instructions,
            include_table_of_contents=include_table_of_contents,
            include_title_slide=include_title_slide,
            web_search=web_search,
            template_font=template_font.strip() if template_font else None,
        )

        sql_session.add(presentation)
        await sql_session.commit()

        logger.info(f"Presentation created: {presentation_id}")
        return presentation

    @staticmethod
    async def generate_outlines(
        sql_session: AsyncSession, presentation_id: uuid.UUID
    ) -> PresentationModel:
        logger.info(f"Generating outlines for presentation: {presentation_id}")
        presentation = await sql_session.get(PresentationModel, presentation_id)
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentation not found")

        temp_dir = TEMP_FILE_SERVICE.create_temp_dir()
        additional_context = ""

        if presentation.file_paths:
            logger.debug(f"Loading documents from {len(presentation.file_paths)} files")
            documents_loader = DocumentsLoader(file_paths=presentation.file_paths)
            await documents_loader.load_documents(temp_dir)
            documents = documents_loader.documents
            if documents:
                additional_context = "\n\n".join(documents)
                logger.debug(f"Loaded {len(documents)} documents for context")

        n_slides_to_generate = presentation.n_slides
        if presentation.include_table_of_contents:
            needed_toc_count = math.ceil((presentation.n_slides - 1) / 10)
            n_slides_to_generate -= math.ceil(
                (presentation.n_slides - needed_toc_count) / 10
            )

        logger.info(f"Generating outlines for {n_slides_to_generate} slides (LLM call)")
        presentation_outlines_text = ""
        async for chunk in generate_ppt_outline(
            presentation.content,
            n_slides_to_generate,
            presentation.language,
            additional_context,
            presentation.tone,
            presentation.verbosity,
            presentation.instructions,
            presentation.include_title_slide,
            presentation.web_search,
        ):
            if isinstance(chunk, HTTPException):
                logger.error(f"HTTPException in outline generation: {chunk.detail}")
                raise chunk
            presentation_outlines_text += chunk

        try:
            presentation_outlines_json = dict(
                dirtyjson.loads(presentation_outlines_text)
            )
        except Exception as e:
            logger.warning(f"JSON Parsing failed: {e}. Attempting repair.")
            try:
                logger.info("Attempting to repair JSON...")
                repaired_text = repair_json_string(presentation_outlines_text)
                presentation_outlines_json = dict(dirtyjson.loads(repaired_text))
                logger.info("JSON Repair successful.")
            except Exception:
                logger.error("JSON Repair failed.")
                traceback.print_exc()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate presentation outlines. JSON Invalid. {str(e)}",
                )

        presentation_outlines = PresentationOutlineModel(**presentation_outlines_json)
        presentation_outlines.slides = presentation_outlines.slides[
            :n_slides_to_generate
        ]

        presentation.outlines = presentation_outlines.model_dump()
        presentation.title = get_presentation_title_from_outlines(presentation_outlines)

        sql_session.add(presentation)
        await sql_session.commit()

        logger.info("Outlines generated and saved.")
        return presentation

    @staticmethod
    async def prepare_structure(
        sql_session: AsyncSession,
        presentation_id: uuid.UUID,
        layout: PresentationLayoutModel,
        outlines: Optional[List[SlideOutlineModel]] = None,
        title: Optional[str] = None,
    ) -> PresentationModel:
        logger.info(f"Preparing structure for presentation: {presentation_id}")
        presentation = await sql_session.get(PresentationModel, presentation_id)
        if not presentation:
            raise HTTPException(status_code=404, detail="Presentation not found")

        # Use provided outlines or fall back to stored outlines
        if not outlines:
            if not presentation.outlines:
                raise HTTPException(
                    status_code=400, detail="Outlines not found in presentation"
                )
            outlines = PresentationOutlineModel(**presentation.outlines).slides

        presentation_outline_model = PresentationOutlineModel(slides=outlines)

        total_slide_layouts = len(layout.slides)
        total_outlines = len(outlines)

        if layout.ordered:
            presentation_structure = layout.to_presentation_structure()
        else:
            logger.info("Generating dynamic structure (LLM call)")
            presentation_structure: PresentationStructureModel = (
                await generate_presentation_structure(
                    presentation_outline=presentation_outline_model,
                    presentation_layout=layout,
                    instructions=presentation.instructions,
                )
            )

        presentation_structure.slides = presentation_structure.slides[: len(outlines)]
        for index in range(total_outlines):
            random_slide_index = random.randint(0, total_slide_layouts - 1)
            if index >= total_outlines:
                presentation_structure.slides.append(random_slide_index)
                continue
            if presentation_structure.slides[index] >= total_slide_layouts:
                presentation_structure.slides[index] = random_slide_index

        if presentation.include_table_of_contents:
            logger.info("Adding Table of Contents")
            n_toc_slides = presentation.n_slides - total_outlines
            toc_slide_layout_index = select_toc_or_list_slide_layout_index(layout)
            if toc_slide_layout_index != -1:
                outline_index = 1 if presentation.include_title_slide else 0
                for i in range(n_toc_slides):
                    outlines_to = outline_index + 10
                    if total_outlines == outlines_to:
                        outlines_to -= 1

                    presentation_structure.slides.insert(
                        i + 1 if presentation.include_title_slide else i,
                        toc_slide_layout_index,
                    )
                    toc_outline = "Table of Contents\n\n"

                    for outline in presentation_outline_model.slides[
                        outline_index:outlines_to
                    ]:
                        page_number = (
                            outline_index - i + n_toc_slides + 1
                            if presentation.include_title_slide
                            else outline_index - i + n_toc_slides
                        )
                        toc_outline += f"Slide page number: {page_number}\n Slide Content: {outline.content[:100]}\n\n"
                        outline_index += 1

                    outline_index += 1

                    presentation_outline_model.slides.insert(
                        i + 1 if presentation.include_title_slide else i,
                        SlideOutlineModel(
                            content=toc_outline,
                        ),
                    )

        sql_session.add(presentation)
        presentation.outlines = presentation_outline_model.model_dump(mode="json")
        presentation.title = title or presentation.title
        presentation.set_layout(layout)
        presentation.set_structure(presentation_structure)
        await sql_session.commit()

        logger.info("Structure prepared and saved.")
        return presentation

    @staticmethod
    async def run_full_generation_pipeline(
        sql_session: AsyncSession,
        presentation_id: uuid.UUID,
        async_status: Optional[AsyncPresentationGenerationTaskModel] = None,
        export_as: Optional[str] = "pptx",
    ):
        logger.info(f"Starting full generation pipeline for: {presentation_id}")
        try:
            presentation = await sql_session.get(PresentationModel, presentation_id)
            if not presentation:
                raise HTTPException(status_code=404, detail="Presentation not found")

            image_generation_service = ImageGenerationService(get_images_directory())

            structure = presentation.get_structure()
            layout = presentation.get_layout()
            outline = presentation.get_presentation_outline()

            # Schedule slide content generation and asset fetching in batches of 10
            slide_layout_indices = structure.slides
            # Ensure indices are within bounds
            valid_indices = [idx for idx in slide_layout_indices if idx < len(layout.slides)]
            slide_layouts = [layout.slides[idx] for idx in valid_indices]
            
            async_assets_generation_tasks = []
            slides: List[SlideModel] = []
            
            batch_size = 10
            total_batches = (len(slide_layouts) + batch_size - 1) // batch_size
            
            for batch_idx, start in enumerate(range(0, len(slide_layouts), batch_size)):
                end = min(start + batch_size, len(slide_layouts))
                logger.info(f"Processing batch {batch_idx + 1}/{total_batches} (Slides {start}-{end-1})")
                
                # Generate contents for this batch concurrently
                content_tasks = [
                    get_slide_content_from_type_and_outline(
                        slide_layouts[i],
                        outline.slides[i],
                        presentation.language,
                        presentation.tone,
                        presentation.verbosity,
                        presentation.instructions,
                    )
                    for i in range(start, end)
                ]
                batch_contents: List[dict] = await asyncio.gather(*content_tasks)
                logger.debug(f"Batch {batch_idx + 1}: Content generated")
                
                # Build slides for this batch
                batch_slides: List[SlideModel] = []
                for offset, slide_content in enumerate(batch_contents):
                    i = start + offset
                    slide_layout = slide_layouts[i]
                    slide = SlideModel(
                        presentation=presentation_id,
                        layout_group=layout.name,
                        layout=slide_layout.id,
                        index=i,
                        speaker_note=slide_content.get("__speaker_note__", ""),
                        content=slide_content,
                    )
                    slides.append(slide)
                    batch_slides.append(slide)
                    
                    # This will mutate slide and add placeholder assets
                    process_slide_add_placeholder_assets(slide)

                # Start asset fetch tasks for just-generated slides
                asset_tasks = [
                    process_slide_and_fetch_assets(image_generation_service, slide)
                    for slide in batch_slides
                ]
                async_assets_generation_tasks.extend(asset_tasks)
            
            # --- Wait for all assets ---
            logger.info(f"Waiting for {len(async_assets_generation_tasks)} asset generation tasks...")
            generated_assets_lists = await asyncio.gather(*async_assets_generation_tasks)
            logger.info("Asset generation completed.")
            
            generated_assets = []
            for assets_list in generated_assets_lists:
                generated_assets.extend(assets_list)

            # --- Save to DB ---
            await sql_session.execute(
                delete(SlideModel).where(SlideModel.presentation == presentation_id)
            )
            await sql_session.commit()

            sql_session.add(presentation)
            sql_session.add_all(slides)
            sql_session.add_all(generated_assets)
            await sql_session.commit()

            # --- Export ---
            if export_as:
                logger.info(f"Exporting presentation as {export_as}...")
                presentation_and_path = await export_presentation(
                    presentation_id,
                    presentation.title or str(uuid.uuid4()),
                    export_as,
                    template_font=presentation.template_font,
                )
                response_data = presentation_and_path.model_dump()
            else:
                response_data = {
                    "presentation_id": presentation_id,
                    "path": None,
                }

            # Response for webhook/status
            response = PresentationPathAndEditPath(
                **response_data,
                edit_path=(
                    f"/presentation?id={presentation_id}&font={quote_plus(presentation.template_font)}"
                    if presentation.template_font
                    else f"/presentation?id={presentation_id}"
                ),
            )
            
            # Update Async Status
            if async_status:
                async_status.message = "Presentation generation completed"
                async_status.status = "completed"
                async_status.data = response.model_dump(mode="json")
                async_status.updated_at = datetime.now()
                sql_session.add(async_status)
                await sql_session.commit()

            # Webhook
            CONCURRENT_SERVICE.run_task(
                None,
                WebhookService.send_webhook,
                WebhookEvent.PRESENTATION_GENERATION_COMPLETED,
                response.model_dump(mode="json"),
            )
            
            logger.info(f"Generation pipeline completed successfully for: {presentation_id}")
            return response

        except Exception as e:
            logger.error(f"Error in generation pipeline: {e}")
            if not isinstance(e, HTTPException):
                traceback.print_exc()
                e = HTTPException(status_code=500, detail="Presentation generation failed")

            api_error_model = APIErrorModel.from_exception(e)
            
            # Webhook Failure
            CONCURRENT_SERVICE.run_task(
                None,
                WebhookService.send_webhook,
                WebhookEvent.PRESENTATION_GENERATION_FAILED,
                api_error_model.model_dump(mode="json"),
            )
            
            if async_status:
                async_status.status = "error"
                async_status.message = "Presentation generation failed"
                async_status.updated_at = datetime.now()
                async_status.error = api_error_model.model_dump(mode="json")
                sql_session.add(async_status)
                await sql_session.commit()
            
            raise e
