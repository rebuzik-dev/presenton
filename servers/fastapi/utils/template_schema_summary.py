from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from models.presentation_layout import PresentationLayoutModel


SPECIAL_FIELD_MAP = {
    "__image_url__": "image_url",
    "__image_prompt__": "image_prompt",
    "__icon_url__": "icon_url",
    "__icon_query__": "icon_query",
}


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


def _infer_schema_type(schema: dict[str, Any]) -> str:
    if "enum" in schema:
        return "enum"
    schema_type = schema.get("type")
    if isinstance(schema_type, str):
        return schema_type
    if isinstance(schema_type, list):
        return "union"
    if any(key in schema for key in ("anyOf", "allOf", "oneOf")):
        return "union"
    return "unknown"


def _collect_constraints(schema: dict[str, Any]) -> dict[str, Any]:
    keys = [
        "minLength",
        "maxLength",
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "pattern",
        "format",
        "minItems",
        "maxItems",
        "multipleOf",
    ]
    return {key: schema[key] for key in keys if key in schema}


def _append_field_summary(
    output: list[dict[str, Any]],
    *,
    path: str,
    schema: dict[str, Any],
    required: bool,
) -> None:
    field_name = path.split(".")[-1] if path else ""
    special_kind = SPECIAL_FIELD_MAP.get(field_name)

    output.append(
        {
            "path": path or "$",
            "type": _infer_schema_type(schema),
            "required": required,
            "description": schema.get("description")
            if isinstance(schema.get("description"), str)
            else None,
            "enum_values": schema.get("enum")
            if isinstance(schema.get("enum"), list)
            else None,
            "default": schema.get("default") if "default" in schema else None,
            "constraints": _collect_constraints(schema),
            "special_kind": special_kind,
        }
    )


def _walk_schema(
    schema: Any,
    *,
    root_schema: dict[str, Any],
    path: str,
    required: bool,
    fields_summary: list[dict[str, Any]],
    array_slots: list[dict[str, Any]],
    seen_refs: set[str],
) -> None:
    if not isinstance(schema, dict):
        return

    ref = schema.get("$ref")
    if isinstance(ref, str):
        if ref in seen_refs:
            return
        resolved = _resolve_local_ref(ref, root_schema)
        if not resolved:
            return
        _walk_schema(
            resolved,
            root_schema=root_schema,
            path=path,
            required=required,
            fields_summary=fields_summary,
            array_slots=array_slots,
            seen_refs=seen_refs | {ref},
        )
        return

    _append_field_summary(fields_summary, path=path, schema=schema, required=required)

    schema_type = schema.get("type")
    properties = schema.get("properties")
    required_keys = set(schema.get("required", [])) if isinstance(schema.get("required"), list) else set()

    if isinstance(properties, dict):
        for key, value in properties.items():
            child_path = f"{path}.{key}" if path else key
            _walk_schema(
                value,
                root_schema=root_schema,
                path=child_path,
                required=key in required_keys,
                fields_summary=fields_summary,
                array_slots=array_slots,
                seen_refs=seen_refs,
            )

    if schema_type == "array":
        min_items = schema.get("minItems") if isinstance(schema.get("minItems"), int) else None
        max_items = schema.get("maxItems") if isinstance(schema.get("maxItems"), int) else None
        array_slots.append(
            {
                "path": (path + "[]") if path else "[]",
                "min_items": min_items,
                "max_items": max_items,
                "approximate": min_items is None and max_items is None,
            }
        )
        items = schema.get("items")
        _walk_schema(
            items,
            root_schema=root_schema,
            path=(path + "[]") if path else "[]",
            required=True,
            fields_summary=fields_summary,
            array_slots=array_slots,
            seen_refs=seen_refs,
        )

    for keyword in ("allOf", "anyOf", "oneOf"):
        variants = schema.get(keyword)
        if not isinstance(variants, list):
            continue
        for index, variant in enumerate(variants):
            variant_path = f"{path}.{keyword}[{index}]" if path else f"{keyword}[{index}]"
            _walk_schema(
                variant,
                root_schema=root_schema,
                path=variant_path,
                required=required,
                fields_summary=fields_summary,
                array_slots=array_slots,
                seen_refs=seen_refs,
            )


def _count_special_slots(fields_summary: list[dict[str, Any]], special_kind: str) -> int:
    return sum(1 for field in fields_summary if field.get("special_kind") == special_kind)


def _normalize_layout_id_for_lookup(layout_id: str) -> list[str]:
    candidates = [layout_id]
    if ":" in layout_id:
        candidates.append(layout_id.split(":", 1)[1])
    return candidates


def _build_source_file_map(
    template_slug: str,
    template_layouts: Optional[list[dict[str, Any]]],
) -> dict[str, str]:
    file_map: dict[str, str] = {}

    if isinstance(template_layouts, list):
        for item in template_layouts:
            if not isinstance(item, dict):
                continue
            source_file = item.get("file")
            if not isinstance(source_file, str) or not source_file.strip():
                continue

            keys: list[str] = []
            for key_name in ("id", "layout_id", "name"):
                key_value = item.get(key_name)
                if isinstance(key_value, str) and key_value.strip():
                    keys.append(key_value.strip())

            file_stem = Path(source_file).stem
            if file_stem:
                keys.append(file_stem)

            for key in keys:
                file_map[key] = source_file

    try:
        from utils.template_style_summary import build_template_style_summary

        style_summary = build_template_style_summary(template_slug)
        for layout in style_summary.get("layouts", []):
            layout_id = layout.get("layout_id")
            source_file = layout.get("source_file")
            if isinstance(layout_id, str) and isinstance(source_file, str):
                file_map.setdefault(layout_id, source_file)
    except Exception:
        # Style summary is optional for source file enrichment.
        pass

    return file_map


def build_template_schema_summary(
    template_slug: str,
    layout: PresentationLayoutModel,
    template_layouts: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    slides_summary: list[dict[str, Any]] = []
    source_file_map = _build_source_file_map(template_slug, template_layouts)

    for index, slide in enumerate(layout.slides):
        json_schema = slide.json_schema if isinstance(slide.json_schema, dict) else {}
        fields_summary: list[dict[str, Any]] = []
        array_slots: list[dict[str, Any]] = []

        _walk_schema(
            json_schema,
            root_schema=json_schema,
            path="",
            required=True,
            fields_summary=fields_summary,
            array_slots=array_slots,
            seen_refs=set(),
        )

        source_file = None
        for candidate in _normalize_layout_id_for_lookup(slide.id):
            if candidate in source_file_map:
                source_file = source_file_map[candidate]
                break
        if source_file is None and isinstance(slide.name, str):
            source_file = source_file_map.get(slide.name)

        slides_summary.append(
            {
                "index": index,
                "layout_id": slide.id,
                "layout_name": slide.name,
                "layout_description": slide.description,
                "source_file": source_file,
                "json_schema": json_schema,
                "fields_summary": fields_summary,
                "content_slots": {
                    "image_slots": _count_special_slots(fields_summary, "image_prompt"),
                    "icon_slots": _count_special_slots(fields_summary, "icon_query"),
                    "array_slots": array_slots,
                },
                "render_hints": {
                    "visible_items_from_schema": array_slots,
                },
            }
        )

    return {
        "template": template_slug,
        "ordered": layout.ordered,
        "layout_count": len(slides_summary),
        "layouts": slides_summary,
    }

