from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

import migrations


EXPECTED_HEAD = "a4c7e2f9b1d6"


def _alembic_config(database_url: str) -> Config:
    config = Config()
    config.set_main_option(
        "script_location", str(Path(__file__).resolve().parents[2] / "alembic")
    )
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_legacy_database_with_theme_is_stamped_past_theme_migration(
    tmp_path, monkeypatch
):
    database_url = f"sqlite:///{tmp_path / 'legacy.db'}"
    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE presentations (id TEXT PRIMARY KEY, theme JSON)")
            )
    finally:
        engine.dispose()

    stamped_revisions = []
    monkeypatch.setattr(
        migrations.command,
        "stamp",
        lambda _config, revision: stamped_revisions.append(revision),
    )

    migrations._stamp_legacy_database_if_needed(
        _alembic_config(database_url), database_url
    )

    assert stamped_revisions == [migrations.REVISION_BEFORE_TEMPLATE_CREATE_INFO]


def test_upgrade_from_baseline_stamp_skips_existing_theme_column(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'baseline-stamped.db'}"
    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE presentations (id TEXT PRIMARY KEY, theme JSON)")
            )
            connection.execute(
                text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
            )
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": migrations.LEGACY_BASELINE_REVISION},
            )

        command.upgrade(_alembic_config(database_url), "head")

        with engine.connect() as connection:
            version = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
            columns = {
                row[1]
                for row in connection.execute(text("PRAGMA table_info(presentations)"))
            }

        assert version == EXPECTED_HEAD
        assert "theme" in columns
    finally:
        engine.dispose()


def test_upgrade_from_theme_stamp_skips_existing_template_create_infos_table(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'template-table-exists.db'}"
    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE presentations (id TEXT PRIMARY KEY, theme JSON)")
            )
            connection.execute(
                text(
                    """
                    CREATE TABLE template_create_infos (
                        id CHAR(32) NOT NULL,
                        fonts JSON,
                        pptx_url VARCHAR,
                        slide_htmls JSON NOT NULL,
                        slide_image_urls JSON NOT NULL,
                        created_at DATETIME NOT NULL,
                        PRIMARY KEY (id)
                    )
                    """
                )
            )
            connection.execute(
                text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
            )
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": migrations.REVISION_BEFORE_TEMPLATE_CREATE_INFO},
            )

        command.upgrade(_alembic_config(database_url), "head")

        with engine.connect() as connection:
            version = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
            tables = {
                row[0]
                for row in connection.execute(
                    text("SELECT name FROM sqlite_master WHERE type = 'table'")
                )
            }

        assert version == EXPECTED_HEAD
        assert "template_create_infos" in tables
    finally:
        engine.dispose()


def test_upgrade_from_template_stamp_skips_existing_chat_history_table(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'chat-table-exists.db'}"
    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE presentations (id TEXT PRIMARY KEY)"))
            connection.execute(
                text(
                    """
                    CREATE TABLE chat_history_messages (
                        id CHAR(32) NOT NULL,
                        presentation_id CHAR(32) NOT NULL,
                        conversation_id CHAR(32) NOT NULL,
                        position INTEGER NOT NULL,
                        role VARCHAR NOT NULL,
                        content TEXT NOT NULL,
                        created_at DATETIME NOT NULL,
                        tool_calls JSON,
                        PRIMARY KEY (id)
                    )
                    """
                )
            )
            connection.execute(
                text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
            )
            connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                {"revision": migrations.REVISION_TEMPLATE_CREATE_INFO},
            )

        command.upgrade(_alembic_config(database_url), "head")

        with engine.connect() as connection:
            version = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
            indexes = {
                row[1]
                for row in connection.execute(
                    text("PRAGMA index_list(chat_history_messages)")
                )
            }

        assert version == EXPECTED_HEAD
        assert {
            "ix_chat_history_messages_conversation_id",
            "ix_chat_history_messages_position",
            "ix_chat_history_messages_presentation_id",
        }.issubset(indexes)
    finally:
        engine.dispose()


def test_prompt_history_migration_creates_baseline_for_existing_profile(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'prompt-history-baseline.db'}"
    config = _alembic_config(database_url)
    command.upgrade(config, migrations.REVISION_BEFORE_PROMPT_HISTORY)

    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO template_prompt_profiles (
                        id, template_slug, template_id, is_active, template_prompt,
                        layout_prompts, created_at, updated_at, created_by_id
                    ) VALUES (
                        :id, :slug, NULL, 1, :template_prompt,
                        :layout_prompts, :created_at, :updated_at, NULL
                    )
                    """
                ),
                {
                    "id": "12345678123456781234567812345678",
                    "slug": "history-fixture",
                    "template_prompt": "Existing prompt",
                    "layout_prompts": '{"hero":{"layout_prompt":"Existing layout"}}',
                    "created_at": "2026-07-13 10:00:00+00:00",
                    "updated_at": "2026-07-13 10:05:00+00:00",
                },
            )

        command.upgrade(config, "head")

        with engine.connect() as connection:
            row = connection.execute(
                text(
                    """
                    SELECT version, action, fingerprint, template_prompt, changes
                    FROM template_prompt_profile_revisions
                    WHERE template_slug = :slug
                    """
                ),
                {"slug": "history-fixture"},
            ).one()
            current_revision = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()

        assert current_revision == EXPECTED_HEAD
        assert row.version == 1
        assert row.action == "baseline"
        assert len(row.fingerprint) == 64
        assert row.template_prompt == "Existing prompt"
        assert row.changes == "[]"
    finally:
        engine.dispose()
