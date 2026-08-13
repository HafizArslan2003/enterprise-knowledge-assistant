from functools import lru_cache
from openai import OpenAI

@lru_cache(maxsize=256)
def _get_cached_embedding(api_key: str, text: str) -> tuple[float, ...]:

    try:
        response = OpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        ).embeddings.create(
            model="gemini-embedding-001",
            input=text,
            dimensions=768,
        )
        return tuple(response.data[0].embedding)
    except Exception:
        return tuple([0.0] * 768)


def get_embedding(api_key: str, text: str, *, use_cache: bool = True) -> list[float]:
    """Return a Gemini embedding, caching normalized query text in-process."""
    normalized_text = " ".join(text.split())
    if use_cache:
        return list(_get_cached_embedding(api_key, normalized_text))

    # Upload chunks are normally unique; do not evict frequently asked query vectors.
    try:
        response = OpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        ).embeddings.create(
            model="gemini-embedding-001",
            input=normalized_text,
            dimensions=768,
        )
        return response.data[0].embedding
    except Exception:
        return [0.0] * 768
