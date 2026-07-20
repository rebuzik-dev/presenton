import asyncio
from typing import List
from models.image_prompt import ImagePrompt
from models.presentation_outline_model import PresentationImageStyle
from models.sql.image_asset import ImageAsset
from models.sql.slide import SlideModel
from sqlalchemy.orm.attributes import flag_modified
from services.icon_finder_service import ICON_FINDER_SERVICE
from services.image_generation_service import ImageGenerationService
from utils.asset_directory_utils import get_images_directory
from utils.dict_utils import get_dict_at_path, get_dict_paths_with_key, set_dict_at_path


from utils.custom_logger import setup_logger

logger = setup_logger(__name__)


def _to_plain_data(value: object) -> object:
    """Convert dirtyjson attributed containers to plain Python dict/list."""
    if isinstance(value, dict):
        return {key: _to_plain_data(item) for key, item in value.items()}

    if isinstance(value, list):
        return [_to_plain_data(item) for item in value]

    if isinstance(value, tuple):
        return [_to_plain_data(item) for item in value]

    return value


def _extract_reference_images(reference_image_source: object) -> list[str]:
    if isinstance(reference_image_source, str):
        source = reference_image_source.strip()
        return [source] if source else []

    if isinstance(reference_image_source, list):
        return [
            source.strip()
            for source in reference_image_source
            if isinstance(source, str) and source.strip()
        ]

    return []

def _image_identity(image_dict: dict) -> tuple[str, tuple[str, ...]]:
    prompt = image_dict.get("__image_prompt__", "")
    references = tuple(
        _extract_reference_images(image_dict.get("__reference_image_source__"))
    )
    return prompt, references


def _build_image_theme_prompt(
    image_style: PresentationImageStyle | None,
) -> str | None:
    if image_style is None:
        return None

    parts = [
        image_style.style.strip(),
        image_style.mood.strip(),
        image_style.lighting.strip(),
        image_style.composition_rules.strip(),
    ]
    parts.extend(
        rule.strip()
        for rule in image_style.consistency_rules
        if isinstance(rule, str) and rule.strip()
    )
    if image_style.palette:
        colors = [
            color.strip()
            for color in image_style.palette.primary + image_style.palette.secondary
            if isinstance(color, str) and color.strip()
        ]
        if colors:
            parts.append(f"Shared presentation palette: {', '.join(colors)}")

    theme_prompt = ". ".join(part for part in parts if part)
    return theme_prompt or None


def _clean_image_prompt(value: object) -> str:
    prompt = str(value or "").strip()
    lowered = prompt.lower()
    for marker in (", none", " none", ", null", " null", ", n/a", " n/a"):
        if lowered.endswith(marker):
            return prompt[: -len(marker)].rstrip(" ,.;")
    return prompt



async def process_slide_and_fetch_assets(
    image_generation_service: ImageGenerationService,
    slide: SlideModel,
    image_style: PresentationImageStyle | None = None,
) -> List[ImageAsset]:

    theme_prompt = _build_image_theme_prompt(image_style)
    async_tasks = []
    updated_content = _to_plain_data(slide.content)
    if not isinstance(updated_content, dict):
        raise TypeError(f"Slide content must be a dict, got {type(updated_content).__name__}")

    image_paths = get_dict_paths_with_key(updated_content, "__image_prompt__")
    icon_paths = get_dict_paths_with_key(updated_content, "__icon_query__")

    logger.debug(f"Processing slide {slide.index}: {len(image_paths)} images, {len(icon_paths)} icons")

    for image_path in image_paths:
        __image_prompt__parent = get_dict_at_path(updated_content, image_path)
        prompt = _clean_image_prompt(__image_prompt__parent["__image_prompt__"])
        reference_images = _extract_reference_images(
            __image_prompt__parent.get("__reference_image_source__")
        )
        logger.debug(f"Queueing image generation for slide {slide.index}: {prompt[:50]}...")
        async_tasks.append(
            image_generation_service.generate_image(
                ImagePrompt(
                    prompt=prompt,
                    theme_prompt=theme_prompt,
                    reference_images=reference_images,
                )
            )
        )

    for icon_path in icon_paths:
        __icon_query__parent = get_dict_at_path(updated_content, icon_path)
        query = __icon_query__parent["__icon_query__"]
        logger.debug(f"Queueing icon search for slide {slide.index}: {query}")
        async_tasks.append(
            ICON_FINDER_SERVICE.search_icons(query)
        )

    logger.debug(f"Awaiting {len(async_tasks)} asset tasks for slide {slide.index}")
    results = await asyncio.gather(*async_tasks)
    results.reverse()

    return_assets = []
    for image_path in image_paths:
        image_dict = get_dict_at_path(updated_content, image_path)
        result = results.pop()
        if isinstance(result, ImageAsset):
            return_assets.append(result)
            image_dict["__image_url__"] = result.path
        else:
            image_dict["__image_url__"] = result
        set_dict_at_path(updated_content, image_path, image_dict)
        logger.debug(
            "Assigned image URL for slide %s at %s: %s",
            slide.index,
            image_path,
            image_dict["__image_url__"],
        )

    for icon_path in icon_paths:
        icon_dict = get_dict_at_path(updated_content, icon_path)
        icon_result = results.pop()
        if icon_result and len(icon_result) > 0:
            icon_dict["__icon_url__"] = icon_result[0]
        else:
            # Fallback to placeholder if no icon found
            icon_dict["__icon_url__"] = "/static/icons/placeholder.svg"
        set_dict_at_path(updated_content, icon_path, icon_dict)
        logger.debug(
            "Assigned icon URL for slide %s at %s: %s",
            slide.index,
            icon_path,
            icon_dict["__icon_url__"],
        )

    slide.content = updated_content
    flag_modified(slide, "content")

    logger.debug(f"Assets processed for slide {slide.index}")
    return return_assets


async def process_old_and_new_slides_and_fetch_assets(
    image_generation_service: ImageGenerationService,
    old_slide_content: dict,
    new_slide_content: dict,
) -> List[ImageAsset]:
    # Finds all old images
    old_image_dict_paths = get_dict_paths_with_key(
        old_slide_content, "__image_prompt__"
    )
    old_image_dicts = [
        get_dict_at_path(old_slide_content, path) for path in old_image_dict_paths
    ]
    old_image_identities = [_image_identity(old_image_dict) for old_image_dict in old_image_dicts]

    # Finds all old icons
    old_icon_dict_paths = get_dict_paths_with_key(old_slide_content, "__icon_query__")
    old_icon_dicts = [
        get_dict_at_path(old_slide_content, path) for path in old_icon_dict_paths
    ]
    old_icon_queries = [
        old_icon_dict["__icon_query__"] for old_icon_dict in old_icon_dicts
    ]

    # Finds all new images
    new_image_dict_paths = get_dict_paths_with_key(
        new_slide_content, "__image_prompt__"
    )
    new_image_dicts = [
        get_dict_at_path(new_slide_content, path) for path in new_image_dict_paths
    ]

    # Finds all new icons
    new_icon_dict_paths = get_dict_paths_with_key(new_slide_content, "__icon_query__")
    new_icon_dicts = [
        get_dict_at_path(new_slide_content, path) for path in new_icon_dict_paths
    ]

    # Creates async tasks for fetching new images
    async_image_fetch_tasks = []
    new_images_fetch_status = []

    # Creates async tasks for fetching new icons
    async_icon_fetch_tasks = []
    new_icons_fetch_status = []

    # Creates async tasks for fetching new images
    # Use old image url if prompt is same
    for new_image in new_image_dicts:
        new_image_identity = _image_identity(new_image)
        if new_image_identity in old_image_identities:
            old_image_url = old_image_dicts[
                old_image_identities.index(new_image_identity)
            ]["__image_url__"]
            new_image["__image_url__"] = old_image_url
            new_images_fetch_status.append(False)
            continue

        async_image_fetch_tasks.append(
            image_generation_service.generate_image(
                ImagePrompt(
                    prompt=new_image["__image_prompt__"],
                    reference_images=_extract_reference_images(
                        new_image.get("__reference_image_source__")
                    ),
                )
            )
        )
        new_images_fetch_status.append(True)

    # Creates async tasks for fetching new icons
    # Use old icon url if query is same
    for new_icon in new_icon_dicts:
        if new_icon["__icon_query__"] in old_icon_queries:
            old_icon_url = old_icon_dicts[
                old_icon_queries.index(new_icon["__icon_query__"])
            ]["__icon_url__"]
            new_icon["__icon_url__"] = old_icon_url
            new_icons_fetch_status.append(False)
            continue

        async_icon_fetch_tasks.append(
            ICON_FINDER_SERVICE.search_icons(new_icon["__icon_query__"])
        )
        new_icons_fetch_status.append(True)

    new_images = await asyncio.gather(*async_image_fetch_tasks)
    new_icons = await asyncio.gather(*async_icon_fetch_tasks)

    # list of new assets
    new_assets = []

    # Sets new image and icon urls for assets that were fetched
    fetched_image_index = 0
    for i, should_fetch in enumerate(new_images_fetch_status):
        if not should_fetch:
            continue

        fetched_image = new_images[fetched_image_index]
        fetched_image_index += 1

        if isinstance(fetched_image, ImageAsset):
            new_assets.append(fetched_image)
            image_url = fetched_image.path
        else:
            image_url = fetched_image
        new_image_dicts[i]["__image_url__"] = image_url

    fetched_icon_index = 0
    for i, should_fetch in enumerate(new_icons_fetch_status):
        if not should_fetch:
            continue

        icon_result = new_icons[fetched_icon_index]
        fetched_icon_index += 1
        if icon_result and len(icon_result) > 0:
            new_icon_dicts[i]["__icon_url__"] = icon_result[0]
        else:
            # Fallback to placeholder if no icon found
            new_icon_dicts[i]["__icon_url__"] = "/static/icons/placeholder.svg"

    for i, new_image_dict in enumerate(new_image_dicts):
        set_dict_at_path(new_slide_content, new_image_dict_paths[i], new_image_dict)

    for i, new_icon_dict in enumerate(new_icon_dicts):
        set_dict_at_path(new_slide_content, new_icon_dict_paths[i], new_icon_dict)

    return new_assets


def process_slide_add_placeholder_assets(slide: SlideModel):
    updated_content = _to_plain_data(slide.content)
    if not isinstance(updated_content, dict):
        raise TypeError(f"Slide content must be a dict, got {type(updated_content).__name__}")

    image_paths = get_dict_paths_with_key(updated_content, "__image_prompt__")
    icon_paths = get_dict_paths_with_key(updated_content, "__icon_query__")

    for image_path in image_paths:
        image_dict = get_dict_at_path(updated_content, image_path)
        image_dict["__image_url__"] = "/static/images/placeholder.jpg"
        set_dict_at_path(updated_content, image_path, image_dict)

    for icon_path in icon_paths:
        icon_dict = get_dict_at_path(updated_content, icon_path)
        icon_dict["__icon_url__"] = "/static/icons/placeholder.svg"
        set_dict_at_path(updated_content, icon_path, icon_dict)

    slide.content = updated_content
