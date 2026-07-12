from unittest.mock import patch

from api.v1.ppt.endpoints.templates import LayoutItemSchema
from api.v1.ppt.router import API_V1_PPT_ROUTER
from utils.db_utils import get_database_url_and_connect_args


def test_codex_auth_router_is_registered():
    paths = {route.path for route in API_V1_PPT_ROUTER.routes}
    assert "/api/v1/ppt/codex/auth/status" in paths


def test_template_layout_schema_keeps_wire_alias():
    item = LayoutItemSchema(
        name="Hero",
        file="Hero.tsx",
        schema={"type": "object"},
    )
    assert item.model_dump(by_alias=True)["schema"] == {"type": "object"}
    assert "schema_" not in item.model_dump(by_alias=True)


def test_database_url_log_redacts_password(tmp_path, capsys):
    with patch(
        "utils.db_utils.get_app_data_directory_env",
        return_value=str(tmp_path),
    ), patch(
        "utils.db_utils.get_database_url_env",
        return_value="postgresql://presenton:super-secret@db.example/presenton",
    ):
        database_url, _ = get_database_url_and_connect_args()

    output = capsys.readouterr().out
    assert "super-secret" not in output
    assert "***" in output
    assert "super-secret" in database_url
