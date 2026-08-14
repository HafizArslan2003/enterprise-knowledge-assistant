import time

from sqlalchemy.orm import Session

from backend.app.models.document import Document, DocumentChunk
from backend.app.services.embedding import get_embedding


# ============================================================
# SETTINGS
# ============================================================

# Minimum similarity required before a chunk is considered useful.
MIN_SIMILARITY_PERCENT = 65.0

# Retrieve more candidates than we finally send to Gemini.
# This is important for multi-document questions.
CANDIDATE_MULTIPLIER = 5

# Maximum number of final chunks returned to the LLM.
DEFAULT_FINAL_CHUNKS = 8

# Maximum number of chunks we allow from the same document.
# This prevents one document from taking the entire context.
MAX_CHUNKS_PER_DOCUMENT = 3


# ============================================================
# COSINE DISTANCE → SIMILARITY %
# ============================================================

def cosine_distance_to_similarity_percent(distance: float) -> float:
    """
    Convert pgvector cosine distance into a similarity percentage.

    pgvector cosine distance:
        0 = identical
        1 = completely unrelated
        2 = opposite

    Example:
        distance = 0.20
        similarity = 90%
    """

    similarity = 1 - (distance / 2)

    similarity = max(0.0, min(1.0, similarity))

    return round(similarity * 100, 1)


# ============================================================
# MAIN SEARCH FUNCTION
# ============================================================

def search_documents(
    db: Session,
    query: str,
    api_key: str,
    top_k: int = DEFAULT_FINAL_CHUNKS,
    user_id: int | None = None,
):
    """
    Search document chunks using Gemini embeddings + pgvector.

    Improvements over the old version:

    1. Retrieves more candidates.
    2. Supports multi-document questions better.
    3. Prevents one document from dominating the results.
    4. Applies similarity filtering.
    5. Keeps feedback scoring.
    6. Returns diverse chunks for the LLM.

    Returns:

        [
            (DocumentChunk, similarity_percent),
            ...
        ]
    """

    print("\n" + "=" * 70)
    print("🔎 RAG SEARCH STARTED")
    print("=" * 70)

    print(f"❓ Query: {query}")
    print(f"🎯 Requested final chunks: {top_k}")

    if user_id is not None:
        print(f"👤 User ID: {user_id}")

    # --------------------------------------------------------
    # 1. CREATE QUERY EMBEDDING
    # --------------------------------------------------------

    print("\n🧠 Creating query embedding...")

    embedding_start = time.time()

    query_vector = get_embedding(
        api_key,
        query,
    )

    embedding_time = time.time() - embedding_start

    print(
        f"⏱️ Query embedding completed in "
        f"{embedding_time:.2f} seconds"
    )

    # --------------------------------------------------------
    # 2. RETRIEVE A LARGE CANDIDATE POOL
    # --------------------------------------------------------

    # Example:
    #
    # top_k = 8
    #
    # candidate_pool_size = 8 * 5 = 40
    #
    # We retrieve 40 candidates and then intelligently
    # select the best 8.
    candidate_pool_size = max(
        top_k * CANDIDATE_MULTIPLIER,
        20,
    )

    print(
        f"📚 Searching top "
        f"{candidate_pool_size} candidate chunks..."
    )

    database_start = time.time()

    candidates_query = (
        db.query(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(
                query_vector
            ).label("distance"),
        )
        .join(DocumentChunk.document)
    )

    # --------------------------------------------------------
    # 3. USER DOCUMENT FILTER
    # --------------------------------------------------------

    if user_id is not None:
        candidates_query = candidates_query.filter(
            Document.uploaded_by == user_id
        )

    # --------------------------------------------------------
    # 4. VECTOR SEARCH
    # --------------------------------------------------------

    candidates = (
        candidates_query
        .order_by("distance")
        .limit(candidate_pool_size)
        .all()
    )

    database_time = time.time() - database_start

    print(
        f"⏱️ Database search completed in "
        f"{database_time:.2f} seconds"
    )

    print(
        f"✅ Database returned "
        f"{len(candidates)} candidate chunks."
    )

    if not candidates:
        print("❌ No candidates found.")

        return []

    # ========================================================
    # 5. SCORE AND FILTER CANDIDATES
    # ========================================================

    scored_candidates = []

    for rank, (chunk, distance) in enumerate(candidates):

        similarity_percent = (
            cosine_distance_to_similarity_percent(
                distance
            )
        )

        # Ignore weak matches.
        if similarity_percent < MIN_SIMILARITY_PERCENT:
            continue

        # Feedback score from your existing system.
        feedback_score = (
            chunk.document.feedback_score or 0
        )

        # Base ranking score.
        #
        # Higher similarity = better.
        # Better feedback = slight bonus.
        #
        # We intentionally keep feedback relatively small
        # so it cannot overpower semantic relevance.
        similarity_score = similarity_percent

        feedback_bonus = feedback_score * 2

        final_score = (
            similarity_score
            + feedback_bonus
        )

        scored_candidates.append(
            {
                "chunk": chunk,
                "distance": distance,
                "similarity": similarity_percent,
                "feedback": feedback_score,
                "score": final_score,
                "rank": rank,
            }
        )

    # --------------------------------------------------------
    # Sort by semantic relevance.
    # --------------------------------------------------------

    scored_candidates.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    # ========================================================
    # 6. DOCUMENT-DIVERSITY SELECTION
    # ========================================================

    """
    This is the most important change.

    Imagine the candidates are:

        Employee.xlsx       90%
        Employee.xlsx       89%
        Employee.xlsx       88%
        Employee.xlsx       87%
        Projects.xlsx       86%
        ProjectTeams.xlsx   85%

    Old system:

        Employee
        Employee
        Employee
        Employee
        Projects
        ...

    That's bad for multi-document reasoning.

    New system limits the number of chunks per document.

    Example:

        Employee.xlsx       90%
        Employee.xlsx       89%
        Projects.xlsx       86%
        ProjectTeams.xlsx   85%
        Engineering.pdf     82%

    This gives Gemini broader context.
    """

    selected = []

    document_counts = {}

    for candidate in scored_candidates:

        chunk = candidate["chunk"]

        # Get document identity.
        document_id = chunk.document.id

        current_count = document_counts.get(
            document_id,
            0,
        )

        # Prevent one document from dominating.
        if current_count >= MAX_CHUNKS_PER_DOCUMENT:
            continue

        selected.append(candidate)

        document_counts[document_id] = (
            current_count + 1
        )

        # Stop once we have enough chunks.
        if len(selected) >= top_k:
            break

    # ========================================================
    # 7. FALLBACK
    # ========================================================

    """
    If diversity filtering produced too few results,
    fill the remaining slots with the next best candidates.

    This prevents the system from returning too little
    context when only one or two documents are relevant.
    """

    if len(selected) < top_k:

        selected_ids = {
            id(item["chunk"])
            for item in selected
        }

        for candidate in scored_candidates:

            if id(candidate["chunk"]) in selected_ids:
                continue

            selected.append(candidate)

            if len(selected) >= top_k:
                break

    # ========================================================
    # 8. DEBUG OUTPUT
    # ========================================================

    print("\n" + "-" * 70)
    print("📊 FINAL RETRIEVAL RESULTS")
    print("-" * 70)

    for index, candidate in enumerate(
        selected,
        start=1,
    ):

        chunk = candidate["chunk"]

        document_name = (
            chunk.document.filename
            if hasattr(chunk.document, "filename")
            else str(chunk.document.id)
        )

        print(
            f"\n#{index}"
        )

        print(
            f"📄 Document: {document_name}"
        )

        print(
            f"📊 Similarity: "
            f"{candidate['similarity']}%"
        )

        print(
            f"📏 Distance: "
            f"{candidate['distance']:.4f}"
        )

        print(
            f"⭐ Feedback: "
            f"{candidate['feedback']}"
        )

        print(
            f"🏆 Score: "
            f"{candidate['score']:.2f}"
        )

    # ========================================================
    # 9. FINAL DOCUMENT SUMMARY
    # ========================================================

    unique_documents = []

    for candidate in selected:

        document_name = (
            candidate["chunk"].document.filename
            if hasattr(
                candidate["chunk"].document,
                "filename",
            )
            else str(
                candidate["chunk"].document.id
            )
        )

        if document_name not in unique_documents:
            unique_documents.append(
                document_name
            )

    print("\n" + "-" * 70)

    print(
        "📚 Documents represented in final context:"
    )

    for document in unique_documents:
        print(f"   ✅ {document}")

    print(
        f"\n📦 Returning "
        f"{len(selected)} chunks."
    )

    print("=" * 70)
    print("🔎 RAG SEARCH FINISHED")
    print("=" * 70 + "\n")

    # ========================================================
    # 10. RETURN
    # ========================================================

    return [
        (
            candidate["chunk"],
            candidate["similarity"],
        )
        for candidate in selected
    ]