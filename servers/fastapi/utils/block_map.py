from __future__ import annotations

from copy import deepcopy
from datetime import timezone
from typing import Any, Iterable, Optional
from urllib.parse import quote

from models.block_map import (
    EditableBlockContent,
    EditableBlockPatchRequest,
    EditableBlockPrompt,
    EditableBlockType,
    EditableSlideBlock,
)
from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from utils.datetime_utils import get_current_utc_datetime
from utils.template_prompt_overrides import find_layout_prompt_override
from utils.template_schema_summary import build_template_schema_summary


FALLBACK_LABELS = {
    "title": "Заголовок",
    "subtitle": "Подзаголовок",
    "image": "Изображение",
    "__image_prompt__": "Промпт изображения",
}


def normalize_block_path(path: str | None) -> str:
    if not path:
        return ""
    return (
        path.strip()
        .replace("[]", "[0]")
        .replace(".0.", "[0].")
    )


def build_editable_block_id(
    layout_id: str,
    block_type: EditableBlockType,
    schema_path: str | None = None,
) -> str:
    encoded_layout = quote(layout_id or "unknown-layout", safe="")
    if block_type == "layout":
        return f"{encoded_layout}:layout"
    encoded_path = quote(normalize_block_path(schema_path) or "unknown", safe="")
    return f"{encoded_layout}:{block_type}:{encoded_path}"


def semantic_label_for_path(path: str | None) -> str:
    normalized = normalize_block_path(path)
    if not normalized:
        return "Блок"

    if normalized in FALLBACK_LABELS:
        return FALLBACK_LABELS[normalized]

    last_token = normalized.split(".")[-1]
    if last_token in FALLBACK_LABELS:
        return FALLBACK_LABELS[last_token]

    array_match = _last_array_segment(normalized)
    if array_match:
        name, index = array_match
        human_index = index + 1
        if name in {"bullets", "items", "points"} and normalized.endswith(f"{name}[{index}]"):
            return f"Пункт списка {human_index}"
        if normalized.endswith(".description"):
            parent = normalized.rsplit(".", 1)[0]
            parent_match = _last_array_segment(parent)
            if parent_match:
                return f"Описание карточки {parent_match[1] + 1}"
        if normalized.endswith(".title"):
            parent = normalized.rsplit(".", 1)[0]
            parent_match = _last_array_segment(parent)
            if parent_match:
                return f"Название карточки {parent_match[1] + 1}"

    readable = (
        normalized.replace("__image_prompt__", "image prompt")
        .replace("_", " ")
        .replace(".", " ")
        .replace("[", " ")
        .replace("]", "")
    )
    return " ".join(readable.split()).capitalize() or "Блок"


def build_template_block_map(
    template_slug: str,
    layout: PresentationLayoutModel,
    prompt_profile: Any | None = None,
) -> list[EditableSlideBlock]:
    blocks: list[EditableSlideBlock] = []
    for slide_layout in layout.slides:
        blocks.extend(
            _build_layout_blocks(
                template_slug=template_slug,
                slide_index=0,
                slide_layout=slide_layout,
                slide_content={},
                prompt_profile=prompt_profile,
                block_overrides={},
            )
        )
    return blocks


def build_slide_block_map(
    *,
    presentation: PresentationModel,
    slide: SlideModel,
    layout: PresentationLayoutModel,
    prompt_profile: Any | None = None,
) -> list[EditableSlideBlock]:
    slide_layout = _find_slide_layout(layout, slide.layout)
    if slide_layout is None:
        slide_layout = SlideLayoutModel(
            id=slide.layout,
            name=slide.layout,
            description=None,
            json_schema={},
        )

    properties = slide.properties if isinstance(slide.properties, dict) else {}
    block_overrides = properties.get("blockOverrides")
    if not isinstance(block_overrides, dict):
        block_overrides = {}

    template_slug = layout.name or slide.layout_group or ""
    return _build_layout_blocks(
        template_slug=template_slug,
        slide_index=slide.index,
        slide_layout=slide_layout,
        slide_content=slide.content if isinstance(slide.content, dict) else {},
        prompt_profile=prompt_profile,
        block_overrides=block_overrides,
    )


async def apply_block_patch(
    sql_session: Any,
    slide: SlideModel,
    block_id: str,
    patch: EditableBlockPatchRequest,
) -> SlideModel:
    slide.properties = dict(slide.properties or {})
    overrides = dict(slide.properties.get("blockOverrides") or {})
    existing = dict(overrides.get(block_id) or {})

    if patch.text is not None:
        slide.content = dict(slide.content or {})
        _set_value_by_path(slide.content, patch.schema_path, patch.text)
        existing["text"] = patch.text

    if patch.semantic_name is not None:
        existing["semantic_name"] = patch.semantic_name
    if patch.description is not None:
        existing["description"] = patch.description
    if patch.prompt_override is not None:
        existing["prompt_override"] = patch.prompt_override
    if patch.image_prompt_override is not None:
        existing["image_prompt_override"] = patch.image_prompt_override
    if patch.style_override is not None:
        existing["style_override"] = patch.style_override

    existing["updated_at"] = (
        get_current_utc_datetime().astimezone(timezone.utc).isoformat()
    )
    overrides[block_id] = existing
    slide.properties["blockOverrides"] = overrides

    sql_session.add(slide)
    await sql_session.commit()
    return slide


def _build_layout_blocks(
    *,
    template_slug: str,
    slide_index: int,
    slide_layout: SlideLayoutModel,
    slide_content: dict[str, Any],
    prompt_profile: Any | None,
    block_overrides: dict[str, Any],
) -> list[EditableSlideBlock]:
    schema_summary = build_template_schema_summary(
        template_slug,
        PresentationLayoutModel(
            name=template_slug,
            ordered=False,
            slides=[slide_layout],
        ),
        None,
    )
    layout_summary = schema_summary["layouts"][0]
    layout_override = _layout_prompt_override(prompt_profile, slide_layout)

    paths = _expand_field_paths(layout_summary["fields_summary"], slide_content)
    output: list[EditableSlideBlock] = []
    for field in paths:
        schema_path = field["path"]
        if schema_path in {"$", ""}:
            continue
        block_type = _block_type_for_field(field)
        if block_type is None:
            continue

        block_id = build_editable_block_id(slide_layout.id, block_type, schema_path)
        override = block_overrides.get(block_id)
        if not isinstance(override, dict):
            override = {}

        source_prompt = _source_prompt_for_field(field, layout_override, block_type)
        override_prompt = (
            override.get("image_prompt_override")
            if block_type == "image"
            else override.get("prompt_override")
        )
        prompt_source = "generated"
        if source_prompt:
            prompt_source = "template_prompt_profile" if _has_profile_prompt(
                layout_override, schema_path, block_type
            ) else "template_default"
        if override_prompt:
            prompt_source = "override"

        output.append(
            EditableSlideBlock(
                block_id=block_id,
                slide_index=slide_index,
                layout_id=slide_layout.id,
                schema_path=schema_path,
                type=block_type,
                semantic_name=override.get("semantic_name")
                or field.get("semantic_name")
                or semantic_label_for_path(schema_path),
                description=override.get("description") or field.get("description"),
                content=EditableBlockContent(
                    text=_string_value_at_path(slide_content, schema_path)
                    if block_type == "text"
                    else None,
                    image_prompt=_string_value_at_path(slide_content, schema_path)
                    if block_type == "image"
                    else None,
                ),
                prompt=EditableBlockPrompt(
                    source=prompt_source,
                    text=source_prompt,
                    override_text=override_prompt,
                ),
                debug={
                    "template_slug": template_slug,
                    "component": slide_layout.name,
                    "raw_path": f"slides[{slide_index}].{schema_path}",
                },
            )
        )

    return output


def _find_slide_layout(
    layout: PresentationLayoutModel,
    layout_id: str,
) -> SlideLayoutModel | None:
    for slide_layout in layout.slides:
        if slide_layout.id == layout_id:
            return slide_layout
        if ":" in slide_layout.id and slide_layout.id.split(":", 1)[1] == layout_id:
            return slide_layout
    return None


def _layout_prompt_override(
    prompt_profile: Any | None,
    slide_layout: SlideLayoutModel,
) -> dict[str, Any] | None:
    if not prompt_profile or not getattr(prompt_profile, "is_active", True):
        return None
    layout_prompts = getattr(prompt_profile, "layout_prompts", None)
    if not isinstance(layout_prompts, dict):
        return None
    return find_layout_prompt_override(
        layout_prompts,
        layout_id=slide_layout.id,
        layout_name=slide_layout.name,
    )


def _source_prompt_for_field(
    field: dict[str, Any],
    layout_override: dict[str, Any] | None,
    block_type: EditableBlockType,
) -> str | None:
    path = field["path"]
    if layout_override:
        prompt_map_name = (
            "image_prompt_overrides" if block_type == "image" else "field_prompts"
        )
        prompt_map = layout_override.get(prompt_map_name)
        if isinstance(prompt_map, dict) and isinstance(prompt_map.get(path), str):
            return prompt_map[path]
    default_value = field.get("default")
    if block_type == "image" and isinstance(default_value, str):
        return default_value
    description = field.get("description")
    return description if isinstance(description, str) else None


def _has_profile_prompt(
    layout_override: dict[str, Any] | None,
    path: str,
    block_type: EditableBlockType,
) -> bool:
    if not layout_override:
        return False
    prompt_map_name = "image_prompt_overrides" if block_type == "image" else "field_prompts"
    prompt_map = layout_override.get(prompt_map_name)
    return isinstance(prompt_map, dict) and isinstance(prompt_map.get(path), str)


def _block_type_for_field(field: dict[str, Any]) -> Optional[EditableBlockType]:
    if field.get("special_kind") == "image_prompt":
        return "image"
    if field.get("special_kind") in {"image_url", "icon_url", "icon_query"}:
        return None
    if field.get("type") == "string":
        return "text"
    return None


def _expand_field_paths(
    fields: Iterable[dict[str, Any]],
    content: dict[str, Any],
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for field in fields:
        path = field.get("path")
        if not isinstance(path, str) or not path or path == "$":
            continue
        if "[]" not in path:
            output.append(field)
            continue

        expanded_paths = _expand_array_path(path, content)
        if not expanded_paths:
            expanded_paths = [path.replace("[]", "[0]")]
        for expanded_path in expanded_paths:
            clone = dict(field)
            clone["path"] = expanded_path
            output.append(clone)
    return output


def _expand_array_path(path: str, content: dict[str, Any]) -> list[str]:
    prefix, suffix = path.split("[]", 1)
    array_value = _value_by_path(content, prefix)
    if not isinstance(array_value, list):
        return []
    return [f"{prefix}[{index}]{suffix}" for index in range(len(array_value))]


def _value_by_path(data: Any, path: str) -> Any:
    current = data
    for token in _path_tokens(path):
        if isinstance(token, int):
            if not isinstance(current, list) or token >= len(current):
                return None
            current = current[token]
        else:
            if not isinstance(current, dict):
                return None
            current = current.get(token)
    return current


def _string_value_at_path(data: dict[str, Any], path: str) -> str | None:
    value = _value_by_path(data, path)
    return value if isinstance(value, str) else None


def _set_value_by_path(data: dict[str, Any], path: str, value: Any) -> None:
    tokens = _path_tokens(path)
    if not tokens:
        return
    current: Any = data
    for index, token in enumerate(tokens[:-1]):
        next_token = tokens[index + 1]
        if isinstance(token, int):
            if not isinstance(current, list):
                return
            while len(current) <= token:
                current.append({} if not isinstance(next_token, int) else [])
            if current[token] is None:
                current[token] = [] if isinstance(next_token, int) else {}
            current = current[token]
        else:
            if not isinstance(current, dict):
                return
            if token not in current or current[token] is None:
                current[token] = [] if isinstance(next_token, int) else {}
            current = current[token]
    final_token = tokens[-1]
    if isinstance(final_token, int):
        if not isinstance(current, list):
            return
        while len(current) <= final_token:
            current.append(None)
        current[final_token] = value
    elif isinstance(current, dict):
        current[final_token] = value


def _path_tokens(path: str) -> list[str | int]:
    normalized = path.replace("]", "")
    tokens: list[str | int] = []
    for chunk in normalized.split("."):
        if not chunk:
            continue
        if "[" in chunk:
            key, index = chunk.split("[", 1)
            if key:
                tokens.append(key)
            if index.isdigit():
                tokens.append(int(index))
        elif chunk.isdigit():
            tokens.append(int(chunk))
        else:
            tokens.append(chunk)
    return tokens


def _last_array_segment(path: str) -> tuple[str, int] | None:
    for token in reversed(path.replace("]", "").split(".")):
        if "[" not in token:
            continue
        name, index = token.split("[", 1)
        if name and index.isdigit():
            return name, int(index)
    return None
