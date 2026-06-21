import sys
from types import ModuleType, SimpleNamespace

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

from api.v1.ppt.router import API_V1_PPT_ROUTER
from api.v1.ppt.endpoints.theme import _normalize_theme, _read_themes_from_row


def test_ppt_router_registers_theme_routes():
    route_paths = {route.path for route in API_V1_PPT_ROUTER.routes}

    assert "/api/v1/ppt/themes/all" in route_paths
    assert "/api/v1/ppt/theme/generate" in route_paths


def test_normalize_theme_completes_legacy_theme_data():
    theme = {
        "id": "legacy-brand",
        "name": "Legacy Brand",
        "colors": {
            "primary": "#123456",
            "background": "#ffffff",
        },
    }

    normalized = _normalize_theme(theme)

    assert normalized.description == "Custom theme"
    assert normalized.user == "local"
    assert normalized.data["colors"]["primary"] == "#123456"
    assert normalized.data["colors"]["background"] == "#ffffff"
    assert normalized.data["colors"]["graph_0"] == "#123456"
    assert normalized.data["colors"]["graph_9"] == "#123456"
    assert normalized.data["fonts"]["textFont"]["name"] == "Inter"


def test_read_themes_from_row_accepts_legacy_storage_keys():
    theme = {"id": "legacy", "name": "Legacy"}

    assert _read_themes_from_row(SimpleNamespace(value=[theme])) == [theme]
    assert _read_themes_from_row(SimpleNamespace(value={"customThemes": [theme]})) == [
        theme
    ]
