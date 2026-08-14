import time

from sqlalchemy.orm import Session

from backend.app.models.document import Document, DocumentChunk
from backend.app.services.embedding import get_embedding


# =========================================================
# Configuration
# =========================================================

MIN_SIMILARITY_PERCENT = 68.0

# Retrieve more candidates than we finally return.
# This gives us a better chance of finding the relevant chunk.
CANDIDATE_MULTIPLIER = 3


# =========================================================
# Similarity conversion
# =========================================================

def cosine_distance_to_similarity_percent(distance: float) -> float:
    """
    Convert pgvector cosine distance into similarity percentage.

    pgvector cosine distance:
        0 = identical
        2 = completely opposite

    We convert that into:
        100% = identical
        0%   = opposite
    """

    similarity = 1 - (distance / 2)

    return round(
        max(0.0, min(1.0, similarity)) * 100,
        1,
    )


# =========================================================
# Document Search
# =========================================================

def search_documents(
    db: Session,
    query: str,
    api_key: str,
    top_k: int = 4,
    user_id: int | None = None,
):
    """
    Search document chunks using vector similarity.

    Returns:
        list of (DocumentChunk, similarity_percent)

    Example:
        [
            (chunk1, 87.5),
            (chunk2, 81.2),
        ]
    """

    print("\n" + "=" * 70)
    print("🔎 RAG SEARCH STARTED")
    print("=" * 70)

    print(f"❓ Query: {query}")
    print(f"🎯 Requested top_k: {top_k}")
    print(f"👤 User ID: {user_id}")

    # =====================================================
    # STEP 1 — Create query embedding
    # =====================================================

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

    # =====================================================
    # STEP 2 — Determine candidate pool
    # =====================================================

    candidate_pool_size = top_k * CANDIDATE_MULTIPLIER

    print(
        f"📚 Searching top {candidate_pool_size} "
        f"candidate chunks..."
    )

    # =====================================================
    # STEP 3 — Build database query
    # =====================================================

    candidates_query = (
        db.query(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(
                query_vector
            ).label("distance"),
        )
        .join(DocumentChunk.document)
    )

    # -----------------------------------------------------
    # Restrict results to current user's documents
    # -----------------------------------------------------

    if user_id is not None:
        candidates_query = candidates_query.filter(
            Document.uploaded_by == user_id
        )

    # =====================================================
    # STEP 4 — Execute vector search
    # =====================================================

    database_start = time.time()

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

    # =====================================================
    # STEP 5 — Check if anything was found
    # =====================================================

    if not candidates:

        print("❌ No candidate chunks found.")

        print("=" * 70)
        print("🔎 RAG SEARCH FINISHED")
        print("=" * 70 + "\n")

        return []

    print(
        f"✅ Database returned "
        f"{len(candidates)} candidate chunks."
    )

    # =====================================================
    # STEP 6 — Inspect candidates
    # =====================================================

    scored = []

    print("\n" + "-" * 70)
    print("📊 CANDIDATE RESULTS")
    print("-" * 70)

    for rank, (chunk, distance) in enumerate(candidates):

        similarity_percent = (
            cosine_distance_to_similarity_percent(
                distance
            )
        )

        # -------------------------------------------------
        # Get document name safely
        # -------------------------------------------------

        try:
            document_name = chunk.document.filename
        except AttributeError:
            try:
                document_name = chunk.document.name
            except AttributeError:
                document_name = "Unknown document"

        # -------------------------------------------------
        # Get chunk text safely
        # -------------------------------------------------

        try:
            chunk_text = chunk.content
        except AttributeError:
            try:
                chunk_text = chunk.text
            except AttributeError:
                chunk_text = str(chunk)

        # -------------------------------------------------
        # Print candidate information
        # -------------------------------------------------

        print("\n" + "=" * 70)

        print(
            f"🔢 Candidate #{rank + 1}"
        )

        print(
            f"📊 Similarity: "
            f"{similarity_percent:.1f}%"
        )

        print(
            f"📄 Document: "
            f"{document_name}"
        )

        print(
            f"📏 Distance: "
            f"{distance:.4f}"
        )

        print("📝 Chunk text:")

        print(
            chunk_text[:1000]
        )

        # -------------------------------------------------
        # Similarity filtering
        # -------------------------------------------------

        if similarity_percent < MIN_SIMILARITY_PERCENT:

            print(
                f"❌ REJECTED — similarity "
                f"{similarity_percent:.1f}% "
                f"is below "
                f"{MIN_SIMILARITY_PERCENT}%"
            )

            continue

        print(
            f"✅ ACCEPTED — similarity "
            f"{similarity_percent:.1f}%"
        )

        # -------------------------------------------------
        # Feedback score
        # -------------------------------------------------

        feedback_score = (
            chunk.document.feedback_score or 0
        )

        # -------------------------------------------------
        # Ranking score
        # -------------------------------------------------

        rank_score = (
            (candidate_pool_size - rank)
            + (feedback_score * 2)
        )

        print(
            f"⭐ Feedback score: "
            f"{feedback_score}"
        )

        print(
            f"🏆 Final rank score: "
            f"{rank_score:.2f}"
        )

        scored.append(
            (
                rank_score,
                chunk,
                similarity_percent,
            )
        )

    # =====================================================
    # STEP 7 — Sort accepted chunks
    # =====================================================

    scored.sort(
        key=lambda x: x[0],
        reverse=True,
    )

    # =====================================================
    # STEP 8 — Return top results
    # =====================================================

    final_results = [
        (chunk, similarity_percent)
        for _, chunk, similarity_percent
        in scored[:top_k]
    ]

    # =====================================================
    # Final debugging information
    # =====================================================

    print("\n" + "-" * 70)
    print("🎯 FINAL RETRIEVED DOCUMENTS")
    print("-" * 70)

    if not final_results:

        print(
            "❌ No chunks survived the similarity threshold."
        )

    else:

        for index, (
            chunk,
            similarity_percent,
        ) in enumerate(final_results):

            try:
                document_name = chunk.document.filename
            except AttributeError:
                try:
                    document_name = chunk.document.name
                except AttributeError:
                    document_name = "Unknown document"

            print(
                f"{index + 1}. "
                f"{document_name} "
                f"({similarity_percent:.1f}%)"
            )

    print(
        f"\n📦 Returning "
        f"{len(final_results)} chunks."
    )

    print("=" * 70)
    print("🔎 RAG SEARCH FINISHED")
    print("=" * 70 + "\n")

    return final_results