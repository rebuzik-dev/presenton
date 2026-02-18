"""
Utilities to extract style-contract metadata from template TSX layouts.
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional


LAYOUT_ID_RE = re.compile(r"""const\s+layoutId\s*=\s*["']([^"']+)["']""")


def _parse_string_literal(value: str) -> Optional[str]:
    value = value.strip()
    if len(value) < 2:
        return None
    quote = value[0]
    if quote not in ("'", '"') or value[-1] != quote:
        return None
    return value[1:-1]


def _split_top_level_args(args: str) -> List[str]:
    parts: List[str] = []
    start = 0
    depth = 0
    quote: Optional[str] = None
    escape = False

    for idx, ch in enumerate(args):
        if quote:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == quote:
                quote = None
            continue

        if ch in ("'", '"'):
            quote = ch
            continue
        if ch in "([{":
            depth += 1
            continue
        if ch in ")]}":
            depth = max(0, depth - 1)
            continue
        if ch == "," and depth == 0:
            parts.append(args[start:idx].strip())
            start = idx + 1

    tail = args[start:].strip()
    if tail:
        parts.append(tail)
    return parts


def _extract_function_calls(source: str, function_name: str) -> List[str]:
    calls: List[str] = []
    needle = f"{function_name}("
    idx = 0

    while True:
        call_start = source.find(needle, idx)
        if call_start == -1:
            break

        i = call_start + len(function_name)
        if i >= len(source) or source[i] != "(":
            idx = call_start + len(needle)
            continue

        depth = 1
        j = i + 1
        quote: Optional[str] = None
        escape = False

        while j < len(source) and depth > 0:
            ch = source[j]
            if quote:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == quote:
                    quote = None
                j += 1
                continue

            if ch in ("'", '"'):
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            j += 1

        if depth == 0:
            calls.append(source[i + 1 : j - 1])
            idx = j
        else:
            break

    return calls


def extract_style_contract_from_source(
    source: str,
    *,
    layout_id: str,
    source_file: str,
) -> Dict[str, Any]:
    color_bindings: List[Dict[str, Optional[str]]] = []
    font_bindings: List[Dict[str, Optional[str]]] = []
    block_ids = set()
    slide_color_tokens = set()
    slide_font_tokens = set()

    for raw_call in _extract_function_calls(source, "resolveColor"):
        args = _split_top_level_args(raw_call)
        if len(args) < 3:
            continue
        block_id = _parse_string_literal(args[1])
        color_property = _parse_string_literal(args[2])
        slide_color_token = _parse_string_literal(args[4]) if len(args) >= 5 else None

        if block_id and color_property:
            color_bindings.append(
                {
                    "block_id": block_id,
                    "property": color_property,
                    "slide_color_token": slide_color_token,
                }
            )
            block_ids.add(block_id)
            if slide_color_token:
                slide_color_tokens.add(slide_color_token)

    for raw_call in _extract_function_calls(source, "resolveFontFamily"):
        args = _split_top_level_args(raw_call)
        if len(args) < 2:
            continue
        block_id = _parse_string_literal(args[1])
        slide_font_token = _parse_string_literal(args[3]) if len(args) >= 4 else None

        if block_id:
            font_bindings.append(
                {
                    "block_id": block_id,
                    "slide_font_token": slide_font_token,
                }
            )
            block_ids.add(block_id)
            if slide_font_token:
                slide_font_tokens.add(slide_font_token)

    for raw_call in _extract_function_calls(source, "resolveSlideColor"):
        args = _split_top_level_args(raw_call)
        if len(args) >= 2:
            token = _parse_string_literal(args[1])
            if token:
                slide_color_tokens.add(token)

    for raw_call in _extract_function_calls(source, "resolveSlideFont"):
        args = _split_top_level_args(raw_call)
        if len(args) >= 2:
            token = _parse_string_literal(args[1])
            if token:
                slide_font_tokens.add(token)

    return {
        "layout_id": layout_id,
        "source_file": source_file,
        "color_bindings": color_bindings,
        "font_bindings": font_bindings,
        "block_ids": sorted(block_ids),
        "slide_color_tokens": sorted(slide_color_tokens),
        "slide_font_tokens": sorted(slide_font_tokens),
    }


def _default_templates_root() -> Path:
    env_path = os.environ.get("NEXTJS_PRESENTATION_TEMPLATES_DIR")
    if env_path:
        return Path(env_path)
    return Path(__file__).resolve().parents[2] / "nextjs" / "presentation-templates"


def build_template_style_summary(
    template_slug: str,
    *,
    templates_root: Optional[Path] = None,
) -> Dict[str, Any]:
    root = templates_root or _default_templates_root()
    template_dir = root / template_slug

    if not template_dir.exists() or not template_dir.is_dir():
        raise FileNotFoundError(f"Template directory not found: {template_dir}")

    layouts: List[Dict[str, Any]] = []
    aggregate_block_ids = set()
    aggregate_slide_color_tokens = set()
    aggregate_slide_font_tokens = set()

    for tsx_file in sorted(template_dir.glob("*.tsx")):
        source = tsx_file.read_text(encoding="utf-8")
        match = LAYOUT_ID_RE.search(source)
        layout_id = match.group(1) if match else tsx_file.stem

        layout_summary = extract_style_contract_from_source(
            source,
            layout_id=layout_id,
            source_file=tsx_file.name,
        )
        layouts.append(layout_summary)
        aggregate_block_ids.update(layout_summary["block_ids"])
        aggregate_slide_color_tokens.update(layout_summary["slide_color_tokens"])
        aggregate_slide_font_tokens.update(layout_summary["slide_font_tokens"])

    return {
        "template": template_slug,
        "layout_count": len(layouts),
        "block_ids": sorted(aggregate_block_ids),
        "slide_color_tokens": sorted(aggregate_slide_color_tokens),
        "slide_font_tokens": sorted(aggregate_slide_font_tokens),
        "layouts": layouts,
    }
