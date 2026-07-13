from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from typing import Any, Optional

from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel


def build_prompt_profile_fingerprint(
    *,
    is_active: bool = True,
    template_prompt: Optional[str] = None,
    layout_prompts: dict[str, Any] | None = None,
) -> str:
    payload = {
        "is_active": bool(is_active),
        "template_prompt": template_prompt,
        "layout_prompts": layout_prompts or {},
    }
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def build_prompt_profile_revision(profile: Any | None) -> dict[str, Optional[str]]:
    updated_at = getattr(profile, "updated_at", None)
    return {
        "fingerprint": build_prompt_profile_fingerprint(
            is_active=bool(getattr(profile, "is_active", True)),
            template_prompt=getattr(profile, "template_prompt", None),
            layout_prompts=getattr(profile, "layout_prompts", None) or {},
        ),
        "updated_at": updated_at.isoformat() if updated_at else None,
    }


def get_active_template_prompt(profile: Any | None) -> Optional[str]:
    if not profile or not getattr(profile, "is_active", True):
        return None
    return _clean_optional_text(getattr(profile, "template_prompt", None))


def merge_generation_instructions(
    instructions: Optional[str],
    template_prompt: Optional[str],
) -> Optional[str]:
    instructions = _clean_optional_text(instructions)
    template_prompt = _clean_optional_text(template_prompt)
    if not template_prompt:
        return instructions
    if not instructions:
        return template_prompt
    return f"{instructions}\n\nTemplate-level instructions:\n{template_prompt}"


def serialize_prompt_profile(profile: Any | None) -> dict[str, Any]:
    if not profile:
        return {
            "id": None,
            "template_slug": None,
            "template_id": None,
            "is_active": True,
            "template_prompt": None,
            "layout_prompts": {},
            "created_at": None,
            "updated_at": None,
        }

    return {
        "id": str(profile.id),
        "template_slug": profile.template_slug,
        "template_id": str(profile.template_id) if profile.template_id else None,
        "is_active": bool(profile.is_active),
        "template_prompt": profile.template_prompt,
        "layout_prompts": profile.layout_prompts or {},
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def normalize_prompt_profile_payload(
    *,
    template_prompt: Optional[str],
    layout_prompts: dict[str, Any] | None,
) -> tuple[Optional[str], dict[str, Any]]:
    normalized_template_prompt = _clean_optional_text(template_prompt)
    normalized_layouts: dict[str, Any] = {}

    if not isinstance(layout_prompts, dict):
        return normalized_template_prompt, normalized_layouts

    for layout_key, raw_layout in layout_prompts.items():
        if not isinstance(layout_key, str) or not layout_key.strip():
            continue
        if not isinstance(raw_layout, dict):
            continue

        entry: dict[str, Any] = {}
        layout_prompt = _clean_optional_text(
            raw_layout.get("layout_prompt")
            or raw_layout.get("layout_description")
        )
        if layout_prompt is not None:
            entry["layout_prompt"] = layout_prompt

        field_prompts = _clean_prompt_map(raw_layout.get("field_prompts"))
        if field_prompts:
            entry["field_prompts"] = field_prompts

        image_prompt_overrides = _clean_prompt_map(raw_layout.get("image_prompt_overrides"))
        if image_prompt_overrides:
            entry["image_prompt_overrides"] = image_prompt_overrides

        if entry:
            normalized_layouts[layout_key.strip()] = entry

    return normalized_template_prompt, normalized_layouts


def apply_prompt_profile_to_layout(
    layout: PresentationLayoutModel,
    profile: Any | None,
) -> PresentationLayoutModel:
    if not profile or not getattr(profile, "is_active", True):
        return layout

    layout_prompts = getattr(profile, "layout_prompts", None)
    if not isinstance(layout_prompts, dict) or not layout_prompts:
        return layout

    new_slides: list[SlideLayoutModel] = []
    for slide in layout.slides:
        overrides = find_layout_prompt_override(
            layout_prompts,
            layout_id=slide.id,
            layout_name=slide.name,
        )
        if not overrides:
            new_slides.append(slide)
            continue

        slide_data = slide.model_dump()
        layout_prompt = overrides.get("layout_prompt") or overrides.get("layout_description")
        if isinstance(layout_prompt, str) and layout_prompt.strip():
            slide_data["description"] = layout_prompt.strip()

        schema = deepcopy(slide.json_schema if isinstance(slide.json_schema, dict) else {})
        field_prompts = overrides.get("field_prompts")
        if isinstance(field_prompts, dict):
            for path, prompt in field_prompts.items():
                if isinstance(path, str) and isinstance(prompt, str) and prompt.strip():
                    _set_schema_description(schema, path, prompt.strip())

        image_prompts = overrides.get("image_prompt_overrides")
        if isinstance(image_prompts, dict):
            for path, prompt in image_prompts.items():
                if isinstance(path, str) and isinstance(prompt, str) and prompt.strip():
                    _set_schema_default(schema, path, prompt.strip())

        slide_data["json_schema"] = schema
        new_slides.append(SlideLayoutModel(**slide_data))

    return PresentationLayoutModel(
        name=layout.name,
        ordered=layout.ordered,
        icon_weight=layout.icon_weight,
        slides=new_slides,
    )


def find_layout_prompt_override(
    layout_prompts: dict[str, Any],
    *,
    layout_id: str,
    layout_name: Optional[str],
) -> dict[str, Any] | None:
    candidates = _layout_key_candidates(layout_id, layout_name)
    for candidate in candidates:
        value = layout_prompts.get(candidate)
        if isinstance(value, dict):
            return value
    return None


def _layout_key_candidates(layout_id: str, layout_name: Optional[str]) -> list[str]:
    candidates = []
    if layout_id:
        candidates.append(layout_id)
        if ":" in layout_id:
            candidates.append(layout_id.split(":", 1)[1])
    if layout_name:
        candidates.append(layout_name)
    seen = set()
    return [c for c in candidates if not (c in seen or seen.add(c))]


def _clean_optional_text(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def _clean_prompt_map(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    output: dict[str, str] = {}
    for key, prompt in value.items():
        if isinstance(key, str) and key.strip() and isinstance(prompt, str) and prompt.strip():
            output[key.strip()] = prompt.strip()
    return output


def _set_schema_description(schema: dict[str, Any], path: str, description: str) -> None:
    target = _resolve_schema_path(schema, path)
    if target is not None:
        target["description"] = description


def _set_schema_default(schema: dict[str, Any], path: str, default_value: str) -> None:
    target = _resolve_schema_path(schema, path)
    if target is not None:
        target["default"] = default_value
    _set_nested_default_prompt(schema, path, default_value)


def _resolve_schema_path(schema: dict[str, Any], path: str) -> dict[str, Any] | None:
    current: Any = schema
    for token in _path_tokens(path):
        if not isinstance(current, dict):
            return None
        if current.get("type") == "array":
            current = current.get("items")
            if not isinstance(current, dict):
                return None
        properties = current.get("properties")
        if isinstance(properties, dict) and token in properties:
            current = properties[token]
        else:
            return None
    return current if isinstance(current, dict) else None


def _set_nested_default_prompt(schema: dict[str, Any], path: str, value: str) -> None:
    tokens = _path_tokens(path)
    if not tokens or tokens[-1] != "__image_prompt__":
        return
    container = _resolve_schema_path(schema, ".".join(tokens[:-1]))
    if not isinstance(container, dict):
        return
    default = container.get("default")
    if isinstance(default, dict):
        default["__image_prompt__"] = value


def _path_tokens(path: str) -> list[str]:
    return [part.replace("[]", "") for part in path.split(".") if part]
