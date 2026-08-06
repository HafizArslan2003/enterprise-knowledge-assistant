import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from pypdf import PdfReader

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.document import Document, DocumentChunk
from backend.app.schemas.document import DocumentResponse
from backend.app.core.chunking import chunk_text
from backend.app.services.embedding import get_embedding

router = APIRouter()

UPLOAD_DIR = "storage/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported right now")

    try:
        filepath = os.path.join(UPLOAD_DIR, file.filename)
        with open(filepath, "wb") as f:
            f.write(file.file.read())

        reader = PdfReader(filepath)
        full_text_by_page = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            full_text_by_page.append((page_num, text))

        new_document = Document(
            filename=file.filename,
            filepath=filepath,
            uploaded_by=current_user.id,
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        chunk_index = 0
        for page_num, page_text in full_text_by_page:
            page_chunks = chunk_text(page_text)
            for c in page_chunks:
                vector = get_embedding(c)
                db_chunk = DocumentChunk(
                    document_id=new_document.id,
                    text=c,
                    page_number=page_num,
                    chunk_index=chunk_index,
                    embedding=vector,
                )
                db.add(db_chunk)
                chunk_index += 1

        db.commit()

        return DocumentResponse(
            id=new_document.id,
            filename=new_document.filename,
            uploaded_at=new_document.uploaded_at,
            chunk_count=chunk_index,
        )

    except Exception as e:
        db.rollback()
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload error: {e}")