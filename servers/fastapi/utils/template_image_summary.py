from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Optional, Tuple

from models.presentation_layout import PresentationLayoutModel
from utils.template_style_summary import build_template_style_summary


SOURCE_IMAGE_PROMPT_RE = re.compile(
    r"""__image_prompt__\s*:\s*["']([^"']+)["']"""
)
PLACEHOLDER_IMAGE_PROMPT_RE = re.compile(
    r"^(?:(?:generic|replaceable)\s+)?(?:image|photo|image prompt)(?:\s+\d+)?$"
    r"|^(?:moodboard)(?:\s+(?:image|photo))?(?:\s+\d+)?$"
    r"|^(?:catering\s+)?overview\s+photo$",
    re.IGNORECASE,
)


def _decode_json_pointer_token(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def _resolve_local_ref(ref: str, root_schema: dict[str, Any]) -> Optional[dict[str, Any]]:
    if not ref.startswith("#/"):
        return None

    current: Any = root_schema
    for raw_part in ref[2:].split("/"):
        part = _decode_json_pointer_token(raw_part)
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]

    return current if isinstance(current, dict) else None


def _get_array_multiplier(schema: dict[str, Any]) -> Tuple[int, bool]:
    max_items = schema.get("maxItems")
    if isinstance(max_items, int) and max_items > 0:
        return max_items, False

    min_items = schema.get("minItems")
    if isinstance(min_items, int) and min_items > 0:
        return min_items, False

    return 1, True


def _count_image_prompt_slots(
    schema: Any,
    root_schema: dict[str, Any],
    seen_refs: set[str],
) -> Tuple[int, bool]:
    if not isinstance(schema, dict):
        return 0, False

    total_slots = 0
    is_approximate = False

    ref = schema.get("$ref")
    if isinstance(ref, str):
        if ref in seen_refs:
            return 0, True
        resolved = _resolve_local_ref(ref, root_schema)
        if not resolved:
            return 0, True
        return _count_image_prompt_slots(resolved, root_schema, seen_refs | {ref})

    properties = schema.get("properties")
    if isinstance(properties, dict):
        if "__image_prompt__" in properties:
            total_slots += 1

        for child_schema in properties.values():
            child_slots, child_approx = _count_image_prompt_slots(
                child_schema,
                root_schema,
                seen_refs,
            )
            total_slots += child_slots
            is_approximate = is_approximate or child_approx

    if schema.get("type") == "array":
        item_slots, item_approx = _count_image_prompt_slots(
            schema.get("items"),
            root_schema,
            seen_refs,
        )
        multiplier, multiplier_is_approximate = _get_array_multiplier(schema)
        total_slots += item_slots * multiplier
        is_approximate = (
            is_approximate
            or item_approx
            or (item_slots > 0 and multiplier_is_approximate)
        )

    for keyword in ("allOf", "anyOf", "oneOf"):
        variants = schema.get(keyword)
        if isinstance(variants, list):
            if keyword in {"anyOf", "oneOf"} and len(variants) > 1:
                is_approximate = True

            for variant in variants:
                variant_slots, variant_approx = _count_image_prompt_slots(
                    variant,
                    root_schema,
                    seen_refs,
                )
                total_slots += variant_slots
                is_approximate = is_approximate or variant_approx

    return total_slots, is_approximate


def count_image_prompt_slots(schema: dict[str, Any]) -> Tuple[int, bool]:
    if not isinstance(schema, dict):
        return 0, False
    return _count_image_prompt_slots(schema, schema, set())


def is_placeholder_image_prompt(value: str | None) -> bool:
    if not isinstance(value, str) or not value.strip():
        return True
    return bool(PLACEHOLDER_IMAGE_PROMPT_RE.match(value.strip()))


def _collect_image_slot_paths(
    schema: Any,
    *,
    root_schema: dict[str, Any],
    path: str,
    seen_refs: set[str],
) -> list[str]:
    if not isinstance(schema, dict):
        return []

    ref = schema.get("$ref")
    if isinstance(ref, str):
        if ref in seen_refs:
            return []
        resolved = _resolve_local_ref(ref, root_schema)
        if not resolved:
            return []
        return _collect_image_slot_paths(
            resolved,
            root_schema=root_schema,
            path=path,
            seen_refs=seen_refs | {ref},
        )

    paths: list[str] = []
    properties = schema.get("properties")
    if isinstance(properties, dict):
        for name, child in properties.items():
            child_path = f"{path}.{name}" if path else name
            if name == "__image_prompt__":
                paths.append(child_path)
                continue
            paths.extend(
                _collect_image_slot_paths(
                    child,
                    root_schema=root_schema,
                    path=child_path,
                    seen_refs=seen_refs,
                )
            )

    if schema.get("type") == "array":
        multiplier, _ = _get_array_multiplier(schema)
        for index in range(multiplier):
            item_path = f"{path}[{index}]" if path else f"[{index}]"
            paths.extend(
                _collect_image_slot_paths(
                    schema.get("items"),
                    root_schema=root_schema,
                    path=item_path,
                    seen_refs=seen_refs,
                )
            )

    for keyword in ("allOf", "anyOf", "oneOf"):
        variants = schema.get(keyword)
        if isinstance(variants, list):
            for variant in variants:
                paths.extend(
                    _collect_image_slot_paths(
                        variant,
                        root_schema=root_schema,
                        path=path,
                        seen_refs=seen_refs,
                    )
                )

    return list(dict.fromkeys(paths))


def extract_slide_image_slots(
    schema: dict[str, Any],
    prompts: list[str],
    expected_count: int,
) -> list[dict[str, Any]]:
    paths = _collect_image_slot_paths(
        schema,
        root_schema=schema,
        path="",
        seen_refs=set(),
    )
    while len(paths) < expected_count:
        paths.append(f"image_slots[{len(paths)}].__image_prompt__")

    slots: list[dict[str, Any]] = []
    for index in range(expected_count):
        raw_hint = prompts[index] if index < len(prompts) else None
        placeholder = is_placeholder_image_prompt(raw_hint)
        slots.append(
            {
                "slot_index": index,
                "schema_path": paths[index],
                "default_hint": None if placeholder else raw_hint,
                "is_placeholder": placeholder,
            }
        )
    return slots


def _append_unique_prompt(prompts: list[str], value: str) -> None:
    prompt = value.strip()
    if prompt and prompt not in prompts:
        prompts.append(prompt)


def _collect_prompts_from_default_value(
    default_value: Any,
    prompts: list[str],
) -> None:
    if isinstance(default_value, dict):
        image_prompt = default_value.get("__image_prompt__")
        if isinstance(image_prompt, str):
            _append_unique_prompt(prompts, image_prompt)

        for nested_value in default_value.values():
            _collect_prompts_from_default_value(nested_value, prompts)
        return

    if isinstance(default_value, list):
        for item in default_value:
            _collect_prompts_from_default_value(item, prompts)


def _collect_image_prompt_candidates(
    schema: Any,
    root_schema: dict[str, Any],
    seen_refs: set[str],
    field_name: Optional[str],
    concrete_prompts: list[str],
    fallback_prompts: list[str],
) -> None:
    if not isinstance(schema, dict):
        return

    if "default" in schema:
        _collect_prompts_from_default_value(schema.get("default"), concrete_prompts)

    if field_name == "__image_prompt__":
        field_default = schema.get("default")
        if isinstance(field_default, str):
            _append_unique_prompt(fallback_prompts, field_default)

    ref = schema.get("$ref")
    if isinstance(ref, str):
        if ref in seen_refs:
            return
        resolved = _resolve_local_ref(ref, root_schema)
        if not resolved:
            return
        _collect_image_prompt_candidates(
            resolved,
            root_schema,
            seen_refs | {ref},
            field_name,
            concrete_prompts,
            fallback_prompts,
        )
        return

    properties = schema.get("properties")
    if isinstance(properties, dict):
        for key, child_schema in properties.items():
            _collect_image_prompt_candidates(
                child_schema,
                root_schema,
                seen_refs,
                key,
                concrete_prompts,
                fallback_prompts,
            )

    if schema.get("type") == "array":
        _collect_image_prompt_candidates(
            schema.get("items"),
            root_schema,
            seen_refs,
            field_name,
            concrete_prompts,
            fallback_prompts,
        )

    for keyword in ("allOf", "anyOf", "oneOf"):
        variants = schema.get(keyword)
        if isinstance(variants, list):
            for variant in variants:
                _collect_image_prompt_candidates(
                    variant,
                    root_schema,
                    seen_refs,
                    field_name,
                    concrete_prompts,
                    fallback_prompts,
                )


def extract_slide_image_prompts(schema: dict[str, Any]) -> list[str]:
    if not isinstance(schema, dict):
        return []

    concrete_prompts: list[str] = []
    fallback_prompts: list[str] = []

    _collect_image_prompt_candidates(
        schema,
        schema,
        set(),
        None,
        concrete_prompts,
        fallback_prompts,
    )

    return concrete_prompts if concrete_prompts else fallback_prompts


def _normalize_layout_id_for_lookup(layout_id: str) -> list[str]:
    candidates = [layout_id]
    if ":" in layout_id:
        candidates.append(layout_id.split(":", 1)[1])
    return candidates


def _default_templates_root() -> Path:
    env_path = os.environ.get("NEXTJS_PRESENTATION_TEMPLATES_DIR")
    if env_path:
        return Path(env_path)
    return Path(__file__).resolve().parents[2] / "nextjs" / "presentation-templates"


def _build_layout_source_file_map(template_slug: str) -> dict[str, str]:
    source_file_map: dict[str, str] = {}
    try:
        style_summary = build_template_style_summary(template_slug)
    except Exception:
        return source_file_map

    for layout in style_summary.get("layouts", []):
        layout_id = layout.get("layout_id")
        source_file = layout.get("source_file")
        if isinstance(layout_id, str) and isinstance(source_file, str):
            source_file_map[layout_id] = source_file

    return source_file_map


def _extract_image_prompts_from_source(source: str) -> list[str]:
    prompts: list[str] = []
    for match in SOURCE_IMAGE_PROMPT_RE.findall(source):
        _append_unique_prompt(prompts, match)
    return prompts


def _extract_image_prompts_from_layout_source(
    template_slug: str,
    layout_id: str,
    source_file_map: dict[str, str],
) -> list[str]:
    template_dir = _default_templates_root() / template_slug
    for candidate in _normalize_layout_id_for_lookup(layout_id):
        source_file = source_file_map.get(candidate)
        if not source_file:
            continue

        source_path = template_dir / source_file
        if not source_path.exists():
            continue

        try:
            source = source_path.read_text(encoding="utf-8")
        except Exception:
            continue

        prompts = _extract_image_prompts_from_source(source)
        if prompts:
            return prompts

    return []


def build_slide_description(
    layout_description: Optional[str],
    schema: dict[str, Any],
    max_fields: int = 10,
) -> str:
    parts: list[str] = []

    if layout_description:
        parts.append(layout_description.strip())

    schema_title = schema.get("title")
    if isinstance(schema_title, str) and schema_title.strip():
        parts.append(f"Schema: {schema_title.strip()}")

    properties = schema.get("properties")
    if isinstance(properties, dict) and properties:
        field_names = list(properties.keys())
        visible_fields = field_names[:max_fields]
        suffix = ", ..." if len(field_names) > len(visible_fields) else ""
        parts.append(f"Fields: {', '.join(visible_fields)}{suffix}")

    if not parts:
        return "No slide description available"
    return " | ".join(parts)


def build_layout_image_summary(
    template_slug: str,
    layout: PresentationLayoutModel,
) -> dict[str, Any]:
    slides: list[dict[str, Any]] = []
    total_slots = 0
    source_file_map = _build_layout_source_file_map(template_slug)

    for index, slide in enumerate(layout.slides):
        json_schema = slide.json_schema if isinstance(slide.json_schema, dict) else {}
        image_slots, is_approximate = count_image_prompt_slots(json_schema)
        total_slots += image_slots
        image_prompts = extract_slide_image_prompts(json_schema)
        if not image_prompts and image_slots > 0:
            image_prompts = _extract_image_prompts_from_layout_source(
                template_slug,
                slide.id,
                source_file_map,
            )
        if image_slots > 0 and len(image_prompts) > image_slots:
            image_prompts = image_prompts[-image_slots:]

        slides.append(
            {
                "index": index,
                "layout_id": slide.id,
                "layout_name": slide.name,
                "schema_title": json_schema.get("title")
                if isinstance(json_schema.get("title"), str)
                else None,
                "slide_description": build_slide_description(
                    slide.description,
                    json_schema,
                ),
                "image_prompt_slots": image_slots,
                "image_prompts": image_prompts,
                "image_slots": extract_slide_image_slots(
                    json_schema,
                    image_prompts,
                    image_slots,
                ),
                "count_is_approximate": is_approximate,
            }
        )

    return {
        "template": template_slug,
        "ordered": layout.ordered,
        "total_image_prompt_slots": total_slots,
        "slides": slides,
    }
