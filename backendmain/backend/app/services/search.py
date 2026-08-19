import time

from sqlalchemy.orm import Session

from backend.app.models.document import Document, DocumentChunk
from backend.app.services.embedding import get_embedding


CANDIDATE_MULTIPLIER = 5
DEFAULT_FINAL_CHUNKS = 8


def cosine_distance_to_similarity_percent(
    distance: float,
) -> float:
    similarity = 1.0 - float(distance)
    similarity = max(0.0, min(1.0, similarity))
    return round(similarity * 100.0, 1)


def search_documents(
    db: Session,
    query: str,
    api_key: str,
    top_k: int = DEFAULT_FINAL_CHUNKS,
    user_id: int | None = None,
):
    """
    Search document chunks using Gemini embeddings + pgvector.

    pgvector ranks candidates by cosine distance.
    We keep the best semantic matches and do not apply
    a hard similarity cutoff.
    """

    print("\n" + "=" * 70)
    print("🔎 RAG SEARCH STARTED")
    print("=" * 70)

    print(f"❓ Query: {query}")
    print(f"🎯 Requested final chunks: {top_k}")

    if user_id is not None:
        print(f"👤 User ID: {user_id}")

    if not query or not query.strip():
        print("❌ Empty query.")
        return []

    if top_k <= 0:
        print("❌ top_k must be greater than 0.")
        return []

    # --------------------------------------------------------
    # 1. QUERY EMBEDDING
    # --------------------------------------------------------

    print("\n🧠 Creating query embedding...")

    embedding_start = time.time()

    query_vector = get_embedding(
        api_key,
        query.strip(),
    )

    print(
        f"⏱️ Query embedding completed in "
        f"{time.time() - embedding_start:.2f} seconds"
    )

    if not query_vector:
        print("❌ Query embedding is empty.")
        return []

    # --------------------------------------------------------
    # 2. CANDIDATE SEARCH
    # --------------------------------------------------------

    candidate_pool_size = max(
        top_k * CANDIDATE_MULTIPLIER,
        20,
    )

    print(
        f"📚 Searching top "
        f"{candidate_pool_size} candidate chunks..."
    )

    database_start = time.time()

    distance_expression = (
        DocumentChunk.embedding.cosine_distance(
            query_vector
        )
    )

    candidates_query = (
        db.query(
            DocumentChunk,
            distance_expression.label("distance"),
        )
        .join(DocumentChunk.document)
    )

    if user_id is not None:
        candidates_query = candidates_query.filter(
            Document.uploaded_by == user_id
        )

    candidates = (
        candidates_query
        .order_by(distance_expression)
        .limit(candidate_pool_size)
        .all()
    )

    print(
        f"⏱️ Database search completed in "
        f"{time.time() - database_start:.2f} seconds"
    )

    print(
        f"✅ Database returned "
        f"{len(candidates)} candidate chunks."
    )

    if not candidates:
        print("❌ No candidates found.")
        return []

    # --------------------------------------------------------
    # 3. SCORE CANDIDATES
    # --------------------------------------------------------

    scored_candidates = []

    for rank, (chunk, distance) in enumerate(
        candidates,
        start=1,
    ):
        similarity_percent = (
            cosine_distance_to_similarity_percent(
                distance
            )
        )

        feedback_score = (
            chunk.document.feedback_score or 0
        )

        scored_candidates.append(
            {
                "chunk": chunk,
                "distance": float(distance),
                "similarity": similarity_percent,
                "feedback": feedback_score,
                "rank": rank,
            }
        )

    # --------------------------------------------------------
    # 4. SORT BY SEMANTIC RELEVANCE
    # --------------------------------------------------------

    scored_candidates.sort(
        key=lambda item: item["similarity"],
        reverse=True,
    )

    selected = scored_candidates[:top_k]

    # --------------------------------------------------------
    # 5. DEBUG RESULTS
    # --------------------------------------------------------

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

        print(f"\n#{index}")
        print(f"📄 Document: {document_name}")
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
            f"🔢 Original vector rank: "
            f"{candidate['rank']}"
        )

        # Show a small preview so we can verify retrieval.
        preview = (
            chunk.text[:300]
            .replace("\n", " ")
            if chunk.text
            else ""
        )

        print(f"📝 Preview: {preview}")

    # --------------------------------------------------------
    # 6. DOCUMENT SUMMARY
    # --------------------------------------------------------

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
            unique_documents.append(document_name)

    print("\n" + "-" * 70)
    print("📚 Documents represented in final context:")

    for document in unique_documents:
        print(f"   ✅ {document}")

    print(
        f"\n📦 Returning {len(selected)} chunks."
    )

    print("=" * 70)
    print("🔎 RAG SEARCH FINISHED")
    print("=" * 70 + "\n")

    # --------------------------------------------------------
    # 7. RETURN
    # --------------------------------------------------------

    return [
        (
            candidate["chunk"],
            candidate["similarity"],
        )
        for candidate in selected
    ]