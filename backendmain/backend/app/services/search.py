from sqlalchemy.orm import Session
from backend.app.models.document import DocumentChunk
from backend.app.services.embedding import get_embedding


def search_documents(db: Session, query: str, top_k: int = 4):
    query_vector = get_embedding(query)
    candidate_pool_size = top_k * 3

    candidates = (
        db.query(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(query_vector).label("distance"),
        )
        .order_by("distance")
        .limit(candidate_pool_size)
        .all()
    )

    if not candidates:
        return []

    scored = []
    for rank, (chunk, distance) in enumerate(candidates):
        similarity_score = candidate_pool_size - rank
        feedback_score = chunk.document.feedback_score or 0
        combined_score = similarity_score + (feedback_score * 2)
        scored.append((combined_score, chunk, distance))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [(chunk, distance) for _, chunk, distance in scored[:top_k]]