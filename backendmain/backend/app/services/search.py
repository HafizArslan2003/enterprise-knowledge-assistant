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


from backend.app.models.user import User

def search_documents(
    db: Session,
    query: str,
    api_key: str,
    top_k: int = DEFAULT_FINAL_CHUNKS,
    user: User | None = None,
):
    """
    Search document chunks using local embeddings + pgvector.

    pgvector ranks candidates by cosine distance.
    We keep the best semantic matches and do not apply
    a hard similarity cutoff.

    Access rules (enforced here at the query level, not just by
    prompting the LLM):
      - admin:    "company" + "restricted" documents
      - employee: their own "private" documents + "company" documents
                  ("restricted" is never included in this query, so an
                  employee cannot retrieve those chunks regardless of
                  anything the LLM might otherwise be talked into saying)
    """

    print("\n" + "=" * 70)
    print("🔎 RAG SEARCH STARTED")
    print("=" * 70)

    print(f"❓ Query: {query}")
    print(f"🎯 Requested final chunks: {top_k}")

    if user is not None:
        print(f"👤 User ID: {user.id} ({user.role})")

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

    query_vector = get_embedding(query.strip())

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

    if user is not None:
        if user.role == "admin":
            from sqlalchemy import or_
            candidates_query = candidates_query.filter(
                or_(Document.type == "company", Document.type == "restricted")
            )
            candidates = (
                candidates_query
                .order_by(distance_expression)
                .limit(candidate_pool_size)
                .all()
            )
        else:
            # For employees: run TWO separate searches
            # 1) Their own private docs (always include ALL of them for relevance)
            from sqlalchemy import or_
            private_query = candidates_query.filter(
                Document.type == "private",
                Document.uploaded_by == user.id
            )
            private_candidates = (
                private_query
                .order_by(distance_expression)
                .limit(candidate_pool_size)
                .all()
            )

            # 2) Company docs — "restricted" is intentionally never queried
            # here, so employees cannot retrieve those chunks at all.
            company_query = (
                db.query(
                    DocumentChunk,
                    distance_expression.label("distance"),
                )
                .join(DocumentChunk.document)
                .filter(Document.type == "company")
            )
            company_candidates = (
                company_query
                .order_by(distance_expression)
                .limit(candidate_pool_size)
                .all()
            )

            # Merge: private docs take priority slots, then fill with company docs
            private_ids = {chunk.id for chunk, _ in private_candidates}
            combined = list(private_candidates)
            for item in company_candidates:
                if item[0].id not in private_ids:
                    combined.append(item)

            # Sort combined by distance
            candidates = sorted(combined, key=lambda x: float(x[1]))[:candidate_pool_size]
    else:
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

    # Apply minimum similarity threshold filtering (drop irrelevant/calculus chunks)
    MIN_SIMILARITY = 47.0  # Equivalent to cosine distance <= 0.53
    filtered_candidates = [c for c in scored_candidates if c["similarity"] >= MIN_SIMILARITY]

    if not filtered_candidates:
        print(f"⚠️ All {len(scored_candidates)} candidates were below minimum similarity threshold ({MIN_SIMILARITY}%).")
        return []

    # For employees: guarantee that their private doc chunks are included
    # even if company docs rank higher in similarity. Reserve at least
    # half of top_k slots for private docs if the user has any.
    if user is not None and user.role == "employee":
        private_scored = [c for c in filtered_candidates if c["chunk"].document.type == "private"]
        company_scored = [c for c in filtered_candidates if c["chunk"].document.type != "private"]

        if private_scored:
            # Give private docs at least half the slots (minimum 1)
            private_slots = max(1, top_k // 2)
            company_slots = top_k - min(len(private_scored), private_slots)
            selected = private_scored[:private_slots] + company_scored[:company_slots]
            # Re-sort the selected by similarity
            selected.sort(key=lambda item: item["similarity"], reverse=True)
        else:
            selected = filtered_candidates[:top_k]
    else:
        selected = filtered_candidates[:top_k]

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