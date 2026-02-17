from __future__ import annotations

from typing import Any, Optional, Tuple

from models.presentation_layout import PresentationLayoutModel, SlideLayoutModel


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

    for index, slide in enumerate(layout.slides):
        json_schema = slide.json_schema if isinstance(slide.json_schema, dict) else {}
        image_slots, is_approximate = count_image_prompt_slots(json_schema)
        total_slots += image_slots

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
                "count_is_approximate": is_approximate,
            }
        )

    return {
        "template": template_slug,
        "ordered": layout.ordered,
        "total_image_prompt_slots": total_slots,
        "slides": slides,
    }

