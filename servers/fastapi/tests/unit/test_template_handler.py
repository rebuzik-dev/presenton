import asyncio
import sys
import uuid
from types import ModuleType

llmai_stub = ModuleType("llmai")
llmai_stub.get_client = lambda *args, **kwargs: None
llmai_stub.__path__ = []
llmai_shared_stub = ModuleType("llmai.shared")
llmai_shared_stub.__path__ = []
llmai_errors_stub = ModuleType("llmai.shared.errors")


class LlmaiSharedStub:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs


class LlmaiBaseError(Exception):
    status_code = 500
    message = "LLM error"


class OpenAIApiTypeStub:
    COMPLETIONS = "completions"


for name in (
    "BedrockClientConfig",
    "FireworksClientConfig",
    "LMStudioClientConfig",
    "TogetherAIClientConfig",
):
    setattr(llmai_stub, name, LlmaiSharedStub)

for name in (
    "AnthropicClientConfig",
    "AzureOpenAIClientConfig",
    "CerebrasClientConfig",
    "ChatGPTClientConfig",
    "ClientConfig",
    "GoogleClientConfig",
    "ImageContentPart",
    "JSONSchemaResponse",
    "LiteLLMClientConfig",
    "LLMTool",
    "Message",
    "OpenAIClientConfig",
    "OpenRouterClientConfig",
    "ResponseStreamCompletionChunk",
    "ResponseFormat",
    "SystemMessage",
    "TextResponse",
    "UserMessage",
    "VertexAIClientConfig",
    "WebSearchTool",
):
    setattr(llmai_shared_stub, name, LlmaiSharedStub)

llmai_shared_stub.OpenAIApiType = OpenAIApiTypeStub
llmai_shared_stub.normalize_content_parts = lambda content: content or []
llmai_errors_stub.BaseError = LlmaiBaseError
sys.modules.setdefault("llmai", llmai_stub)
sys.modules.setdefault("llmai.shared", llmai_shared_stub)
sys.modules.setdefault("llmai.shared.errors", llmai_errors_stub)

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from models.sql.presentation_layout_code import PresentationLayoutCodeModel
from models.sql.template import TemplateModel
from templates.handler import _normalize_layout_code_for_create, get_all_templates


def test_normalize_layout_code_repairs_bare_asset_fields():
    code = """
const data = {
  icon: {
    __icon_url__
    __icon_query__: "play"
  },
};
"""

    normalized = _normalize_layout_code_for_create(code)

    assert '__icon_url__: "/static/icons/placeholder.svg",' in normalized
    assert '__icon_query__: "play"' in normalized


def test_normalize_layout_code_rewrites_raw_asset_field_names():
    code = """
const data = {
  icon: {
    icon_url: "/static/icons/placeholder.svg",
    icon_query: "play",
  },
};
"""

    normalized = _normalize_layout_code_for_create(code)

    assert '__icon_url__: "/static/icons/placeholder.svg"' in normalized
    assert '__icon_query__: "play"' in normalized


def test_normalize_layout_code_does_not_renormalize_asset_fields():
    code = """
const data = {
  icon: {
    __icon_url__: "/static/icons/placeholder.svg",
    __icon_query__: "play",
  },
};
"""

    normalized = _normalize_layout_code_for_create(code)

    assert "____icon_url____" not in normalized
    assert "____icon_query____" not in normalized
    assert '__icon_url__: "/static/icons/placeholder.svg"' in normalized


def test_get_all_templates_includes_legacy_layout_groups_without_template_metadata(tmp_path):
    async def runner():
        engine = create_async_engine(
            f"sqlite+aiosqlite:///{tmp_path / 'templates.db'}",
            connect_args={"check_same_thread": False},
        )
        try:
            async with engine.begin() as conn:
                await conn.run_sync(
                    lambda sync_conn: SQLModel.metadata.create_all(
                        sync_conn,
                        tables=[
                            TemplateModel.__table__,
                            PresentationLayoutCodeModel.__table__,
                        ],
                    )
                )

            legacy_template_id = uuid.uuid4()
            Session = async_sessionmaker(engine, expire_on_commit=False)
            async with Session() as session:
                session.add(
                    PresentationLayoutCodeModel(
                        presentation=legacy_template_id,
                        layout_id="legacy-cover",
                        layout_name="Legacy Cover",
                        layout_code="const layoutId = 'legacy-cover';",
                    )
                )
                await session.commit()

                templates = await get_all_templates(
                    include_defaults=False,
                    sql_session=session,
                )

            assert len(templates) == 1
            assert templates[0].id == f"custom-{legacy_template_id}"
            assert templates[0].name == f"custom-{legacy_template_id}"
            assert templates[0].total_layouts == 1
        finally:
            await engine.dispose()

    asyncio.run(runner())
