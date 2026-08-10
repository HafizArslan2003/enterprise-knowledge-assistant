from pypdf import PdfReader
from docx import Document as DocxDocument
from openpyxl import load_workbook


def extract_pdf_text_by_page(filepath: str) -> list[tuple[int, str]]:
    """
    Returns a list of (page_number, text) tuples for a PDF file.
    """
    reader = PdfReader(filepath)
    pages = []
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append((page_num, text))
    return pages


def extract_docx_text_by_page(filepath: str) -> list[tuple[int, str]]:
    """
    Word documents don't have a real concept of 'pages' at the text level,
    so we treat the whole document as a single page (page_number=1).
    """
    doc = DocxDocument(filepath)
    full_text = "\n".join([para.text for para in doc.paragraphs])
    return [(1, full_text)]


def extract_xlsx_text_by_page(filepath: str) -> list[tuple[int, str]]:
    """
    Each sheet in the workbook is treated as one 'page'.
    Each row is converted into a readable comma-separated line of text.
    """
    workbook = load_workbook(filepath, data_only=True)
    pages = []

    for sheet_index, sheet_name in enumerate(workbook.sheetnames, start=1):
        sheet = workbook[sheet_name]
        lines = [f"Sheet: {sheet_name}"]

        for row in sheet.iter_rows(values_only=True):
            # Skip completely empty rows
            if all(cell is None for cell in row):
                continue
            row_text = ", ".join(str(cell) if cell is not None else "" for cell in row)
            lines.append(row_text)

        sheet_text = "\n".join(lines)
        pages.append((sheet_index, sheet_text))

    return pages


def extract_text_by_page(filepath: str, filename: str) -> list[tuple[int, str]]:
    """
    Detects file type by extension and routes to the correct extractor.
    """
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        return extract_pdf_text_by_page(filepath)
    elif lower_name.endswith(".docx"):
        return extract_docx_text_by_page(filepath)
    elif lower_name.endswith(".xlsx"):
        return extract_xlsx_text_by_page(filepath)
    else:
        raise ValueError(f"Unsupported file type: {filename}")