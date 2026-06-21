from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[4]


def _frontend_service_block(compose_file: str) -> str:
    text = (REPO_ROOT / compose_file).read_text(encoding="utf-8")
    return text.split("\n  frontend:", 1)[1].split("\nvolumes:", 1)[0]


def test_dokploy_frontend_points_auth_proxy_to_backend():
    frontend = _frontend_service_block("docker-compose.dokploy.yml")
    assert "      - FAST_API_INTERNAL_URL=http://backend:8000" in frontend
