from sqlalchemy.orm import Session
from backend.app.models.document import Document, DocumentChunk
from backend.app.services.embedding import get_embedding

MIN_SIMILARITY_PERCENT = 68.0  # below this, a chunk is not a real match — don't cite it

def cosine_distance_to_similarity_percent(distance: float) -> float:
    # pgvector cosine_distance ranges 0 (identical) .. 2 (opposite)
    similarity = 1 - (distance / 2)
    return round(max(0.0, min(1.0, similarity)) * 100, 1)

def search_documents(
    db: Session,
    query: str,
    api_key: str,
    top_k: int = 4,
    user_id: int | None = None,
):
    """
    Returns a list of (DocumentChunk, similarity_percent) tuples,
    filtered to only chunks that actually match well.
    """
    query_vector = get_embedding(api_key, query)
    candidate_pool_size = top_k * 3

    candidates_query = (
        db.query(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(query_vector).label("distance"),
        )
        .join(DocumentChunk.document)
    )
    if user_id is not None:
        candidates_query = candidates_query.filter(Document.uploaded_by == user_id)

    candidates = (
        candidates_query
        .order_by("distance")
        .limit(candidate_pool_size)
        .all()
    )

    if not candidates:
        return []

    scored = []
    for rank, (chunk, distance) in enumerate(candidates):
        similarity_percent = cosine_distance_to_similarity_percent(distance)
        if similarity_percent < MIN_SIMILARITY_PERCENT:
            continue  # too weak a match — do not cite as a source
        feedback_score = chunk.document.feedback_score or 0
        rank_score = (candidate_pool_size - rank) + (feedback_score * 2)
        scored.append((rank_score, chunk, similarity_percent))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [(chunk, pct) for _, chunk, pct in scored[:top_k]]
