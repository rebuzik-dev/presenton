from models.image_prompt import ImagePrompt


def test_image_prompt_does_not_append_none_theme():
    assert ImagePrompt(prompt="Catering dish photo").get_image_prompt() == "Catering dish photo"


def test_image_prompt_appends_configured_theme():
    prompt = ImagePrompt(prompt="Catering dish photo", theme_prompt="premium presentation")
    assert prompt.get_image_prompt(with_theme=True) == "Catering dish photo, premium presentation"
