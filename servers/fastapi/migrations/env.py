from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Import all SQLModel models for autogenerate support ---
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from models.sql.template import TemplateModel
from models.sql.image_asset import ImageAsset
from models.sql.key_value import KeyValueSqlModel
from models.sql.presentation_layout_code import PresentationLayoutCodeModel
from models.sql.webhook_subscription import WebhookSubscription
from models.sql.async_presentation_generation_status import AsyncPresentationGenerationTaskModel
from models.sql.user import UserModel
from models.sql.api_key import ApiKeyModel

# Use SQLModel metadata for autogenerate
target_metadata = SQLModel.metadata

# --- Database URL from environment or db_utils ---
import os
from dotenv import load_dotenv
from utils.db_utils import get_database_url_and_connect_args

# Load .env from project root (../../../.env relative to this file)
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
load_dotenv(dotenv_path)

def get_url():
    """Get database URL, preferring env var for flexibility."""
    url = os.getenv("DATABASE_URL")
    if url:
        # Convert async driver to sync for Alembic
        if url.startswith("postgresql://"):
            return url
        elif url.startswith("sqlite://"):
            return url
    # Fallback to db_utils
    db_url, _ = get_database_url_and_connect_args()
    # Alembic needs sync driver, not async
    db_url = db_url.replace("+aiosqlite", "").replace("+asyncpg", "")
    return db_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,  # Detect column type changes
            compare_server_default=True,  # Detect default value changes
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
