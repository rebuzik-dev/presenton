from __future__ import annotations

from copy import deepcopy
from typing import Any


LEGACY_CATERING_FLAG_RULE = (
    "The background of all slides must match the colors of the Russian flag."
)


UNIVERSAL_TEMPLATE_PROMPTS: dict[str, str] = {
    "catering": (
        "Создавай универсальную презентацию кейтеринга для события из брифа. "
        "Названия, даты, площадку, количество гостей, форматы обслуживания, меню, "
        "граммовки и пищевые ограничения используй только при их явном наличии в "
        "брифе. Недостающие факты не придумывай: опускай их или используй нейтральную "
        "формулировку. Можно предлагать уместные творческие решения по меню, подаче, "
        "сервисным зонам и гостевому пути в рамках аудитории, бюджета и ограничений "
        "брифа. Для каждого image slot формируй отдельный содержательный кадр без "
        "случайных надписей, логотипов и вымышленного брендинга. Общую палитру и стиль "
        "передавай через image_style, не повторяй HEX-коды в каждом ТЗ изображения."
    ),
    "decor-floristics-template": (
        "Создавай универсальную презентацию декора и флористики для события из брифа. "
        "Названия, даты, площадку, размеры, количество зон, бюджет и обязательные "
        "элементы используй только при их явном наличии в брифе. Не фиксируй цветы, "
        "сезон, праздник, конструкции или особенности площадки без основания в брифе. "
        "Недостающие факты опускай или формулируй нейтрально. Можно предлагать "
        "творческую концепцию, материалы, композиции и сценарии оформления в рамках "
        "задачи и ограничений. Каждый image slot должен описывать отдельный кадр без "
        "случайных надписей, логотипов и вымышленного брендинга; палитру и общий стиль "
        "передавай через image_style."
    ),
    "souvenir": (
        "Создавай универсальную презентацию сувенирной продукции для задачи из брифа. "
        "Названия, даты, аудиторию, тираж, бюджет, материалы, размеры и перечень изделий "
        "используй только при их явном наличии в брифе. Если конкретные изделия не "
        "заданы, можно предложить подходящую линейку с учётом назначения, аудитории, "
        "тиража и бюджета, ясно обозначая её как предложение. Не переносить в сувениры "
        "флористику, сервировку и другие несвязанные предметные области. Каждый image "
        "slot должен показывать отдельный продукт, материал, деталь, упаковку или "
        "сценарий применения без случайных надписей, логотипов и вымышленного "
        "брендинга. Палитру и общий стиль передавай через image_style."
    ),
    "video": (
        "Создавай универсальную презентацию концепции видеоролика по брифу. Названия, "
        "даты, аудиторию, площадку, длительность, формат и обязательные сцены используй "
        "только при их явном наличии в брифе. Таймкоды рассчитывай только из указанной "
        "длительности; если длительности нет, используй названия драматургических "
        "этапов без вымышленных таймкодов. Можно предлагать творческую драматургию, "
        "визуальные приёмы и тональность в рамках задачи и ограничений. Image slots "
        "одного эпизода должны описывать разные планы: общий, действие, деталь, эмоцию "
        "или альтернативный ракурс. Не добавляй случайные надписи, логотипы и "
        "вымышленный брендинг; палитру и общий стиль передавай через image_style."
    ),
}


def merge_universal_prompt_profile(
    *,
    template_slug: str,
    template_prompt: Any,
    layout_prompts: Any,
) -> tuple[Any, Any, bool]:
    """Apply code-owned defaults without overwriting user-authored prompt overrides."""

    merged_template_prompt = template_prompt
    changed = False
    if template_slug in UNIVERSAL_TEMPLATE_PROMPTS and (
        not isinstance(template_prompt, str) or not template_prompt.strip()
    ):
        merged_template_prompt = UNIVERSAL_TEMPLATE_PROMPTS[template_slug]
        changed = True

    merged_layout_prompts = layout_prompts
    if template_slug == "catering" and isinstance(layout_prompts, dict):
        cleaned_layout_prompts = deepcopy(layout_prompts)
        for layout_key, raw_layout in list(cleaned_layout_prompts.items()):
            if not isinstance(raw_layout, dict):
                continue
            cleaned_layout = deepcopy(raw_layout)
            for prompt_key in ("layout_prompt", "layout_description"):
                prompt = cleaned_layout.get(prompt_key)
                if (
                    isinstance(prompt, str)
                    and prompt.strip() == LEGACY_CATERING_FLAG_RULE
                ):
                    cleaned_layout.pop(prompt_key, None)
            if cleaned_layout:
                cleaned_layout_prompts[layout_key] = cleaned_layout
            else:
                cleaned_layout_prompts.pop(layout_key, None)
        if cleaned_layout_prompts != layout_prompts:
            merged_layout_prompts = cleaned_layout_prompts
            changed = True

    return merged_template_prompt, merged_layout_prompts, changed
