from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI

from services.database import create_db_and_tables
from services.template_service import template_service
from utils.get_env import get_app_data_directory_env
from utils.model_availability import (
    check_llm_and_image_provider_api_or_model_availability,
)


logger = logging.getLogger(__name__)


@asynccontextmanager
async def app_lifespan(_: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Initializes the application data directory, database, and seeds system templates.

    """
    os.makedirs(get_app_data_directory_env(), exist_ok=True)
    await create_db_and_tables()
    
    # Seed system templates (general, modern, etc.) on startup
    try:
        count = await template_service.seed_system_templates()
        if count > 0:
            logger.info(f"Seeded {count} system templates")
    except Exception as e:
        logger.warning(f"Failed to seed system templates: {e}")
    
    await check_llm_and_image_provider_api_or_model_availability()
    yield

