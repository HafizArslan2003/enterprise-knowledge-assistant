import time
import re

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
    history: list[dict[str, str]] | None = None,
    doc_filter: str | None = None,
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

    search_text = query.strip()
    
    # NOTE: We no longer append raw history messages (especially assistant answers)
    # directly to the embedding search_text. 
    # Appending a 1500+ character previous answer about "calculus" completely 
    # diluted the embedding for a new query like "list all clients", 
    # causing the vector search to return the calculus document at 76% similarity.
    # The history is still passed to the LLM for answering, but the vector search
    # will strictly search using the exact current query.
    
    query_vector = get_embedding(search_text)

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
            # Admin sees company + restricted docs (private docs belong to employees,
            # admins manage company-wide knowledge — not individual employee uploads)
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
            # Employee: search their own private docs + company docs
            # based on the doc_filter selection from the UI dropdown
            from sqlalchemy import or_

            private_candidates = []
            if doc_filter in ("all", "private", None):
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

            company_candidates = []
            if doc_filter in ("all", "company", None):
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

            # Merge private + company, deduplicate by chunk id, sort by distance
            private_ids = {chunk.id for chunk, _ in private_candidates}
            combined = list(private_candidates)
            for item in company_candidates:
                if item[0].id not in private_ids:
                    combined.append(item)

            candidates = sorted(combined, key=lambda x: float(x[1]))[:candidate_pool_size]
    else:
        # No user context — search all non-private docs (safe default)
        candidates_query = candidates_query.filter(Document.type != "private")
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
    # 3. SCORE CANDIDATES (Hybrid: Vector + Keyword)
    # --------------------------------------------------------

    scored_candidates = []
    
    # Extract keywords > 3 chars for hybrid text matching, ignoring common stop words.
    # Expanded list prevents question words ("who", "whos", "tell", "list") from
    # getting keyword boosts and pulling in unrelated documents.
    stop_words = {
        "tell", "about", "what", "this", "that", "give", "show", "find",
        "have", "with", "from", "who", "whos", "whose", "which", "when",
        "where", "how", "does", "did", "the", "and", "for", "are", "was",
        "were", "can", "could", "would", "should", "may", "might", "will",
        "shall", "all", "any", "our", "your", "their", "its", "let", "list",
        "please", "just", "also", "more", "some", "into", "them", "they",
        "been", "has", "had", "not", "but", "than", "then", "out",
    }
    raw_terms = set(re.findall(r'\b\w{3,}\b', query.lower()))
    query_terms = {term for term in raw_terms if term not in stop_words}

    for rank, (chunk, distance) in enumerate(
        candidates,
        start=1,
    ):
        similarity_percent = (
            cosine_distance_to_similarity_percent(
                distance
            )
        )
        
        # Hybrid Scoring Boost
        chunk_text_lower = chunk.text.lower() if chunk.text else ""
        doc_filename_lower = chunk.document.filename.lower() if hasattr(chunk.document, "filename") and chunk.document.filename else ""
        
        # Looser match: also check singular/plural forms (very basic stemming)
        text_match_count = 0
        filename_match_count = 0
        for term in query_terms:
            base_term = term[:-1] if term.endswith('s') else term
            
            # Use regex boundaries \b so "plan" doesn't falsely match "planet" 
            # or "car" matching "carpet", which ruins search accuracy.
            pattern = r'\b' + re.escape(base_term) + r'\b'
            
            if re.search(pattern, chunk_text_lower):
                text_match_count += 1
            if re.search(pattern, doc_filename_lower):
                filename_match_count += 1
        
        # Boost by a fixed amount per matching keyword (e.g. +5% per word, up to max +25%).
        # Previously, this divided by len(query_terms), which severely penalized long 
        # queries (like the MedLink escalation question) by making the boost negligible.
        text_boost = min(text_match_count * 5.0, 25.0)
        filename_boost = min(filename_match_count * 5.0, 10.0)
        
        final_similarity = similarity_percent + text_boost + filename_boost

        scored_candidates.append(
            {
                "chunk": chunk,
                "distance": float(distance),
                "similarity": final_similarity,
                "original_similarity": similarity_percent,
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

    # Apply minimum similarity threshold filtering.
    # Lowered drastically to 5.0% because long conversational queries (or typos like 
    # 'queshi') have naturally low mathematical cosine similarity. The LLM is smart 
    # enough to say "I don't know" if the top 4 chunks are irrelevant, so we shouldn't 
    # prematurely filter them out here and starve the LLM.
    MIN_SIMILARITY = 5.0

    filtered_candidates = [c for c in scored_candidates if c["similarity"] >= MIN_SIMILARITY]

    if not filtered_candidates:
        print(f"⚠️ No candidates met the {MIN_SIMILARITY}% threshold after boosting. Returning empty result.")
        return []

    # Simply take the top_k most similar chunks. 
    # Access rights (which documents the user is allowed to see) are already 
    # securely filtered in the database query earlier in this function.
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