import time
from functools import lru_cache

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

_model = None


def _get_model():
    global _model
    if _model is None:
        print("Loading SentenceTransformer model (first time only)...")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("Model loaded successfully.")
    return _model


@lru_cache(maxsize=256)
def _get_cached_embedding(text: str) -> tuple:
    start = time.time()
    try:
        model = _get_model()
        embedding = model.encode(text, normalize_embeddings=True).tolist()
        elapsed = time.time() - start
        print(f"Embedding completed in {elapsed:.2f}s, size: {len(embedding)}")
        return tuple(float(v) for v in embedding)
    except Exception as e:
        raise RuntimeError("Local embedding generation failed.") from e


def get_embedding(
    text: str,
    *,
    api_key: str = "",
    use_cache: bool = True,
) -> list:
    """
    Generate a local embedding using SentenceTransformers.
    The api_key parameter is kept for backward compatibility but is NOT used.
    Embeddings are free and generated locally with no API key needed.
    """
    if not text or not text.strip():
        raise ValueError("Cannot generate embedding for empty text.")

    normalized_text = " ".join(text.split())
    print(f"get_embedding() called | text length: {len(normalized_text)}")

    if use_cache:
        print("Cache enabled.")
        cache_before = _get_cached_embedding.cache_info()
        embedding = _get_cached_embedding(normalized_text)
        cache_after = _get_cached_embedding.cache_info()
        if cache_after.hits > cache_before.hits:
            print("Embedding returned from CACHE.")
        else:
            print("Embedding generated locally.")
        return list(embedding)

    print("Cache disabled - generating fresh embedding...")
    start = time.time()
    try:
        model = _get_model()
        embedding = model.encode(normalized_text, normalize_embeddings=True).tolist()
        elapsed = time.time() - start
        print(f"Non-cached embedding finished in {elapsed:.2f}s")
        return [float(v) for v in embedding]
    except Exception as e:
        raise RuntimeError("Local embedding generation failed.") from e
