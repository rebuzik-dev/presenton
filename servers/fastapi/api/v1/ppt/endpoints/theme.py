import copy
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from models.sql.image_asset import ImageAsset
from models.sql.key_value import KeyValueSqlModel
from services.database import get_async_session
from utils.asset_directory_utils import normalize_slide_asset_url

THEMES_ROUTER = APIRouter(prefix="/themes", tags=["Themes"])
THEMES_STORAGE_KEY = "presentation_custom_themes"
THEME_COLOR_KEYS = [
    "primary",
    "background",
    "card",
    "stroke",
    "primary_text",
    "background_text",
    "graph_0",
    "graph_1",
    "graph_2",
    "graph_3",
    "graph_4",
    "graph_5",
    "graph_6",
    "graph_7",
    "graph_8",
    "graph_9",
]
GRAPH_COLOR_KEYS = [f"graph_{index}" for index in range(10)]
DEFAULT_THEME_COLORS = {
    "primary": "#161616",
    "background": "#ffffff",
    "card": "#dae6ff",
    "stroke": "#d1d1d1",
    "primary_text": "#eeeaea",
    "background_text": "#000000",
    "graph_0": "#2e2e2e",
    "graph_1": "#424242",
    "graph_2": "#585858",
    "graph_3": "#6f6f6f",
    "graph_4": "#868686",
    "graph_5": "#9e9e9e",
    "graph_6": "#b7b7b7",
    "graph_7": "#d1d1d1",
    "graph_8": "#e8e8e8",
    "graph_9": "#f5f5f5",
}
DEFAULT_TEXT_FONT = {
    "name": "Inter",
    "url": "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
}


class ThemeRequest(BaseModel):
    name: str
    description: str
    company_name: Optional[str] = None
    logo: Optional[str] = None
    logo_url: Optional[str] = None
    data: dict[str, Any] = Field(default_factory=dict)


class ThemeUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    company_name: Optional[str] = None
    logo: Optional[str] = None
    logo_url: Optional[str] = None
    data: Optional[dict[str, Any]] = None


class ThemeResponse(BaseModel):
    id: str
    name: str
    description: str
    user: str
    logo: Optional[str] = None
    logo_url: Optional[str] = None
    company_name: Optional[str] = None
    data: dict[str, Any]


def _normalize_text_font(theme: dict[str, Any], data: dict[str, Any]) -> dict[str, str]:
    raw_fonts = data.get("fonts")
    if not isinstance(raw_fonts, dict):
        raw_fonts = theme.get("fonts")
    if not isinstance(raw_fonts, dict):
        raw_fonts = {}

    raw_text_font = raw_fonts.get("textFont")
    if not isinstance(raw_text_font, dict):
        raw_text_font = data.get("textFont")
    if not isinstance(raw_text_font, dict):
        raw_text_font = theme.get("textFont")
    if not isinstance(raw_text_font, dict):
        raw_text_font = {}

    name = raw_text_font.get("name")
    url = raw_text_font.get("url")
    if not isinstance(name, str) or not name.strip():
        name = DEFAULT_TEXT_FONT["name"]
    if not isinstance(url, str) or not url.strip():
        url = DEFAULT_TEXT_FONT["url"]
    return {"name": name.strip(), "url": url.strip()}


def _normalize_theme_data(theme: dict[str, Any]) -> dict[str, Any]:
    raw_data = theme.get("data")
    data = copy.deepcopy(raw_data) if isinstance(raw_data, dict) else {}

    raw_colors = data.get("colors")
    if not isinstance(raw_colors, dict):
        raw_colors = theme.get("colors")
    if not isinstance(raw_colors, dict):
        raw_colors = {}

    colors = dict(DEFAULT_THEME_COLORS)
    for key in THEME_COLOR_KEYS:
        value = raw_colors.get(key)
        if isinstance(value, str) and value.strip():
            colors[key] = value.strip()

    primary_fallback = colors["primary"]
    for key in GRAPH_COLOR_KEYS:
        value = raw_colors.get(key)
        if not isinstance(value, str) or not value.strip():
            colors[key] = primary_fallback

    data["colors"] = colors
    data["fonts"] = {"textFont": _normalize_text_font(theme, data)}
    return data


def _normalize_theme(theme: dict[str, Any]) -> ThemeResponse:
    raw_logo_url = theme.get("logo_url")
    if raw_logo_url is None:
        logo_url = None
    elif isinstance(raw_logo_url, str):
        s = raw_logo_url.strip()
        logo_url = normalize_slide_asset_url(s) if s else None
    else:
        logo_url = raw_logo_url
    return ThemeResponse(
        id=str(theme.get("id") or uuid.uuid4()),
        name=str(theme.get("name") or "Custom Theme"),
        description=str(theme.get("description") or "Custom theme"),
        user=theme.get("user", "local"),
        logo=theme.get("logo"),
        logo_url=logo_url,
        company_name=theme.get("company_name"),
        data=_normalize_theme_data(theme),
    )


async def _get_themes_row(sql_session: AsyncSession) -> Optional[KeyValueSqlModel]:
    return await sql_session.scalar(
        select(KeyValueSqlModel).where(KeyValueSqlModel.key == THEMES_STORAGE_KEY)
    )


def _read_themes_from_row(row: Optional[KeyValueSqlModel]) -> list[dict[str, Any]]:
    if not row:
        return []
    if isinstance(row.value, list):
        themes = row.value
    else:
        value = row.value if isinstance(row.value, dict) else {}
        themes = []
        for key in ("themes", "customThemes", "custom_themes", "savedThemes", "saved_themes"):
            candidate = value.get(key)
            if isinstance(candidate, list):
                themes = candidate
                break
    if not isinstance(themes, list):
        return []
    return copy.deepcopy([theme for theme in themes if isinstance(theme, dict)])


async def _resolve_logo_url(
    sql_session: AsyncSession, logo: Optional[str]
) -> Optional[str]:
    if not logo:
        return None
    try:
        logo_uuid = uuid.UUID(str(logo))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid logo id") from exc

    image_asset = await sql_session.get(ImageAsset, logo_uuid)
    if not image_asset:
        raise HTTPException(status_code=404, detail="Logo not found")
    return normalize_slide_asset_url(image_asset.path)


@THEMES_ROUTER.get("/default", response_model=List[dict[str, Any]])
async def get_default_themes():
    # Built-in themes are provided by Next.js constants in this project.
    return []


@THEMES_ROUTER.get("/all", response_model=List[ThemeResponse])
async def get_themes(sql_session: AsyncSession = Depends(get_async_session)):
    row = await _get_themes_row(sql_session)
    themes = _read_themes_from_row(row)
    return [_normalize_theme(theme) for theme in themes]


@THEMES_ROUTER.post("/create", response_model=ThemeResponse)
async def create_theme(
    payload: ThemeRequest, sql_session: AsyncSession = Depends(get_async_session)
):
    row = await _get_themes_row(sql_session)
    themes = _read_themes_from_row(row)
    logo_url = payload.logo_url or await _resolve_logo_url(sql_session, payload.logo)

    theme = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "description": payload.description,
        "user": "local",
        "logo": payload.logo,
        "logo_url": logo_url,
        "company_name": payload.company_name,
        "data": payload.data,
    }
    themes.append(theme)

    if row:
        row.value = {"themes": themes}
        sql_session.add(row)
    else:
        sql_session.add(KeyValueSqlModel(key=THEMES_STORAGE_KEY, value={"themes": themes}))

    await sql_session.commit()
    return _normalize_theme(theme)


@THEMES_ROUTER.patch("/update/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: str,
    payload: ThemeUpdateRequest,
    sql_session: AsyncSession = Depends(get_async_session),
):
    row = await _get_themes_row(sql_session)
    if not row:
        raise HTTPException(status_code=404, detail="Theme not found")

    themes = _read_themes_from_row(row)
    theme = next((item for item in themes if item.get("id") == theme_id), None)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    if payload.name is not None:
        theme["name"] = payload.name
    if payload.description is not None:
        theme["description"] = payload.description
    if payload.company_name is not None:
        theme["company_name"] = payload.company_name
    if payload.data is not None:
        theme["data"] = payload.data
    if payload.logo is not None:
        theme["logo"] = payload.logo
        theme["logo_url"] = await _resolve_logo_url(sql_session, payload.logo)
    elif payload.logo_url is not None:
        theme["logo_url"] = payload.logo_url

    row.value = {"themes": themes}
    sql_session.add(row)
    await sql_session.commit()
    return _normalize_theme(theme)


@THEMES_ROUTER.delete("/delete/{theme_id}", status_code=204)
async def delete_theme(
    theme_id: str, sql_session: AsyncSession = Depends(get_async_session)
):
    row = await _get_themes_row(sql_session)
    if not row:
        return

    themes = _read_themes_from_row(row)
    row.value = {"themes": [theme for theme in themes if theme.get("id") != theme_id]}
    sql_session.add(row)
    await sql_session.commit()
