import time
from functools import lru_cache

from openai import OpenAI


# =========================================================
# Configuration
# =========================================================

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

# Keep timeout while debugging so a request cannot hang forever.
REQUEST_TIMEOUT = 15.0

# Don't automatically retry while we are debugging.
MAX_RETRIES = 0


# =========================================================
# Cached Gemini Embedding
# =========================================================

@lru_cache(maxsize=256)
def _get_cached_embedding(
    api_key: str,
    text: str,
) -> tuple[float, ...]:

    print("\n" + "=" * 60)
    print("🔍 GEMINI EMBEDDING DEBUG")
    print("=" * 60)

    # -----------------------------------------------------
    # API key information
    # -----------------------------------------------------

    if api_key:
        print("🔑 API key received: YES")
        print(f"🔑 API key length: {len(api_key)}")
    else:
        print("❌ API key received: NO")

    print(f"📝 Text length: {len(text)} characters")
    print(f"🧠 Model: {EMBEDDING_MODEL}")
    print(f"📐 Dimensions: {EMBEDDING_DIMENSIONS}")

    # -----------------------------------------------------
    # Start timer
    # -----------------------------------------------------

    print("🚀 Starting Gemini embedding request...")

    start = time.time()

    try:

        # -------------------------------------------------
        # Create Gemini client
        # -------------------------------------------------

        client_start = time.time()

        client = OpenAI(
            api_key=api_key,
            base_url=GEMINI_BASE_URL,
            timeout=REQUEST_TIMEOUT,
            max_retries=MAX_RETRIES,
        )

        print(
            f"🔧 OpenAI client created in "
            f"{time.time() - client_start:.2f} seconds"
        )

        # -------------------------------------------------
        # Gemini embedding request
        # -------------------------------------------------

        request_start = time.time()

        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            dimensions=EMBEDDING_DIMENSIONS,
        )

        request_time = time.time() - request_start
        total_time = time.time() - start

        print(
            f"🌐 Gemini API request time: "
            f"{request_time:.2f} seconds"
        )

        print(
            f"✅ Total embedding time: "
            f"{total_time:.2f} seconds"
        )

        # -------------------------------------------------
        # Validate response
        # -------------------------------------------------

        if not response.data:
            raise ValueError("Gemini returned an empty embedding response.")

        embedding = response.data[0].embedding

        if not embedding:
            raise ValueError("Gemini returned an empty embedding vector.")

        print(
            f"📊 Embedding vector size: "
            f"{len(embedding)}"
        )

        print("=" * 60)
        print("✅ EMBEDDING SUCCESS")
        print("=" * 60 + "\n")

        return tuple(embedding)

    except Exception as e:

        elapsed = time.time() - start

        print("\n" + "=" * 60)
        print("❌ GEMINI EMBEDDING FAILED")
        print("=" * 60)

        print(
            f"⏱️ Failed after: "
            f"{elapsed:.2f} seconds"
        )

        print(
            f"❌ Error type: "
            f"{type(e).__name__}"
        )

        print(
            f"❌ Error message: "
            f"{e}"
        )

        print("=" * 60 + "\n")

        # IMPORTANT:
        # We keep the same 768 dimensions expected by pgvector.
        return tuple([0.0] * EMBEDDING_DIMENSIONS)


# =========================================================
# Public Embedding Function
# =========================================================

def get_embedding(
    api_key: str,
    text: str,
    *,
    use_cache: bool = True,
) -> list[float]:

    """
    Generate a Gemini embedding for the provided text.

    The query text is normalized before embedding.

    If use_cache=True, repeated identical queries are served
    from the in-memory cache.
    """

    # -----------------------------------------------------
    # Validate input
    # -----------------------------------------------------

    if not api_key:
        print("❌ get_embedding() received an empty API key.")

    if not text or not text.strip():
        print("⚠️ get_embedding() received empty text.")

    # -----------------------------------------------------
    # Normalize text
    # -----------------------------------------------------

    normalized_text = " ".join(text.split())

    print(
        f"📥 get_embedding() called | "
        f"text length: {len(normalized_text)}"
    )

    # -----------------------------------------------------
    # Cached request
    # -----------------------------------------------------

    if use_cache:

        print("💾 Cache enabled.")

        # Check whether this exact request is already cached.
        cache_before = _get_cached_embedding.cache_info()

        embedding = _get_cached_embedding(
            api_key,
            normalized_text,
        )

        cache_after = _get_cached_embedding.cache_info()

        if cache_after.hits > cache_before.hits:
            print("⚡ Embedding returned from CACHE.")

        else:
            print("🌐 Embedding retrieved from Gemini API.")

        return list(embedding)

    # =====================================================
    # Non-cached request
    # =====================================================

    print("🚫 Cache disabled.")
    print("🚀 Starting non-cached Gemini embedding request...")

    start = time.time()

    try:

        client = OpenAI(
            api_key=api_key,
            base_url=GEMINI_BASE_URL,
            timeout=REQUEST_TIMEOUT,
            max_retries=MAX_RETRIES,
        )

        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=normalized_text,
            dimensions=EMBEDDING_DIMENSIONS,
        )

        elapsed = time.time() - start

        print(
            f"✅ Non-cached Gemini embedding finished in "
            f"{elapsed:.2f} seconds"
        )

        if not response.data:
            raise ValueError(
                "Gemini returned an empty embedding response."
            )

        embedding = response.data[0].embedding

        if not embedding:
            raise ValueError(
                "Gemini returned an empty embedding vector."
            )

        print(
            f"📊 Embedding vector size: "
            f"{len(embedding)}"
        )

        return list(embedding)

    except Exception as e:

        elapsed = time.time() - start

        print(
            f"❌ Non-cached Gemini embedding failed after "
            f"{elapsed:.2f} seconds"
        )

        print(
            f"❌ Error type: "
            f"{type(e).__name__}"
        )

        print(
            f"❌ Error message: "
            f"{e}"
        )

        return [0.0] * EMBEDDING_DIMENSIONS