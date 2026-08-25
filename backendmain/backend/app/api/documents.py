from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.document import Document, DocumentChunk
from backend.app.schemas.document import DocumentResponse
from backend.app.core.chunking import chunk_text
from backend.app.services.embedding import get_embedding
from backend.app.services.extraction import extract_text_by_page
from backend.app.core.api_key_crypto import decrypt_api_key

router = APIRouter()

UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = (".pdf", ".docx", ".xlsx")


from fastapi.responses import FileResponse

@router.get("/", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "admin":
        documents = (
            db.query(Document)
            .filter(or_(Document.type == "company", Document.type == "restricted"))
            .order_by(Document.uploaded_at.desc())
            .all()
        )
    else:
        documents = (
            db.query(Document)
            .filter(Document.type == "private", Document.uploaded_by == current_user.id)
            .order_by(Document.uploaded_at.desc())
            .all()
        )

    return [
        DocumentResponse(
            id=document.id,
            filename=document.filename,
            uploaded_at=document.uploaded_at,
            chunk_count=len(document.chunks),
        )
        for document in documents
    ]



@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    restricted: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    restricted: only meaningful for admin uploads. When true, the document
    is tagged "restricted" (admin-only, e.g. sensitive client/finance data)
    instead of the normal "company" type. Ignored for employee uploads —
    employee uploads are always "private", same as before.
    """
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    api_key = decrypt_api_key(current_user.encrypted_gemini_api_key)
    # NOTE: api_key is no longer needed for embeddings (now local).
    # It is still used for LLM chat responses.

    try:
        # Use a unique path so same-named uploads cannot overwrite one another.
        filepath = UPLOAD_DIR / f"{uuid4().hex}_{Path(file.filename).name}"
        with open(filepath, "wb") as f:
            f.write(file.file.read())

        full_text_by_page = extract_text_by_page(str(filepath), file.filename)

        if current_user.role == "admin":
            doc_type = "restricted" if restricted else "company"
        else:
            doc_type = "private"

        new_document = Document(
            filename=file.filename,
            filepath=str(filepath),
            type=doc_type,
            uploaded_by=current_user.id,
        )
        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        chunk_index = 0
        for page_num, page_text in full_text_by_page:
            page_chunks = chunk_text(page_text)
            for c in page_chunks:
                try:
                    vector = get_embedding(c, use_cache=False)
                except Exception:
                    vector = [0.0] * 384

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


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently remove a document."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "admin" and document.type not in ("company", "restricted"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")
    if current_user.role == "employee" and document.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    filepath = document.filepath
    has_other_file_reference = (
        db.query(Document)
        .filter(Document.filepath == filepath, Document.id != document.id)
        .first()
        is not None
    )

    try:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete(
            synchronize_session=False
        )
        db.delete(document)
        db.flush()

        if not has_other_file_reference:
            upload_path = Path(filepath)
            if upload_path.exists():
                upload_path.unlink()

        db.commit()
    except OSError as error:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to remove the uploaded file") from error
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete document")

    return {"status": "deleted"}


@router.get("/{document_id}/view")
def view_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if current_user.role == "admin" and document.type not in ("company", "restricted"):
        raise HTTPException(status_code=403, detail="Not authorized to view this document")
    if current_user.role == "employee" and document.type == "private" and document.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this document")
    if current_user.role == "employee" and document.type == "restricted":
        raise HTTPException(status_code=403, detail="Not authorized to view this document")

    return FileResponse(document.filepath, filename=document.filename)