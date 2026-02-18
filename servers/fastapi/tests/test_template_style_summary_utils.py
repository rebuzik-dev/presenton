from pathlib import Path

import pytest

from utils.template_style_summary import (
    build_template_style_summary,
    extract_style_contract_from_source,
)


def test_extract_style_contract_from_source_parses_color_and_font_bindings():
    source = """
const layoutId = "cover-slide";
const titleColor = resolveColor(slideData, "title", "color", "#3f3f3f", "text_primary");
const titleFont = resolveFontFamily(slideData, "title", rootFont, "display");
const surface = resolveSlideColor(slideData, "surface", "#E6E6E6");
"""

    result = extract_style_contract_from_source(
        source,
        layout_id="cover-slide",
        source_file="CoverSlide.tsx",
    )

    assert result["layout_id"] == "cover-slide"
    assert result["source_file"] == "CoverSlide.tsx"
    assert result["block_ids"] == ["title"]
    assert result["slide_color_tokens"] == ["surface", "text_primary"]
    assert result["slide_font_tokens"] == ["display"]
    assert result["color_bindings"][0]["block_id"] == "title"
    assert result["color_bindings"][0]["property"] == "color"
    assert result["font_bindings"][0]["block_id"] == "title"


def test_build_template_style_summary_from_template_directory(tmp_path: Path):
    template_root = tmp_path / "presentation-templates"
    template_dir = template_root / "demo"
    template_dir.mkdir(parents=True)

    (template_dir / "MainSlide.tsx").write_text(
        """
const layoutId = "main-slide";
const titleColor = resolveColor(slideData, "title", "color", "#222", "text_primary");
const bodyFont = resolveFontFamily(slideData, "body", rootFont, "body");
""",
        encoding="utf-8",
    )

    (template_dir / "NoStyle.tsx").write_text(
        """
const layoutId = "no-style";
export default function X() { return null; }
""",
        encoding="utf-8",
    )

    summary = build_template_style_summary("demo", templates_root=template_root)

    assert summary["template"] == "demo"
    assert summary["layout_count"] == 2
    assert "title" in summary["block_ids"]
    assert "body" in summary["block_ids"]
    assert "text_primary" in summary["slide_color_tokens"]
    assert "body" in summary["slide_font_tokens"]


def test_build_template_style_summary_raises_for_missing_template(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        build_template_style_summary("unknown", templates_root=tmp_path)
