from sqlalchemy.orm import Session
from backend.app.models.document import DocumentChunk
from backend.app.services.embedding import get_embedding


def search_documents(db: Session, query: str, top_k: int = 4) -> list[DocumentChunk]:
    """
    Embeds the query and returns the top_k most similar chunks from the database.
    """
    query_vector = get_embedding(query)

    results = (
        db.query(DocumentChunk)
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(top_k)
        .all()
    )
    return results