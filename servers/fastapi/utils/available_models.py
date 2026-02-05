from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from google import genai


async def list_available_openai_compatible_models(url: str, api_key: str) -> list[str]:
    print(f"Fetching models from: {url}")
    try:
        client = AsyncOpenAI(api_key=api_key, base_url=url, timeout=5.0)
        models = (await client.models.list()).data
        if models:
            return list(map(lambda x: x.id, models))
    except Exception as e:
        print(f"Error fetching OpenAI models: {e}")
    return []


async def list_available_anthropic_models(api_key: str) -> list[str]:
    print("Fetching Anthropic models...")
    try:
        client = AsyncAnthropic(api_key=api_key, timeout=5.0)
        return list(map(lambda x: x.id, (await client.models.list(limit=50)).data))
    except Exception as e:
        print(f"Error fetching Anthropic models: {e}")
        return []


async def list_available_google_models(api_key: str) -> list[str]:
    print("Fetching Google models...")
    try:
        # Google GenAI client might handle timeouts differently, checking docs or using default for now, 
        # but wrapping in try-except is crucial
        client = genai.Client(api_key=api_key)
        # Note: genai.Client doesn't accept timeout in constructor in all versions, 
        # but listing models is usually fast or fails.
        return list(map(lambda x: x.name, client.models.list(config={"page_size": 50})))
    except Exception as e:
        print(f"Error fetching Google models: {e}")
        return []
