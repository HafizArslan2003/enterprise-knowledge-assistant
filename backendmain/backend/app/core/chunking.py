import re


def chunk_text(
    text: str,
    chunk_size: int = 1200,
    overlap: int = 200,
) -> list[str]:
    """
    Split text into overlapping chunks while trying to preserve
    paragraph and sentence boundaries.

    chunk_size and overlap are character-based to remain compatible
    with the existing architecture.
    """

    if not text or not text.strip():
        return []

    # ---------------------------------------------------------
    # Normalize whitespace
    # ---------------------------------------------------------

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove excessive blank lines while preserving paragraphs.
    text = re.sub(r"\n{3,}", "\n\n", text)

    text = text.strip()

    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:

        target_end = min(
            start + chunk_size,
            text_length,
        )

        # -----------------------------------------------------
        # Find the best natural boundary before target_end
        # -----------------------------------------------------

        end = target_end

        # Prefer paragraph boundary.
        paragraph_boundary = text.rfind(
            "\n\n",
            start,
            target_end,
        )

        if paragraph_boundary > start + (chunk_size * 0.5):
            end = paragraph_boundary

        else:
            # Prefer sentence boundary.
            sentence_matches = list(
                re.finditer(
                    r"[.!?](?:\s+|\n|$)",
                    text[start:target_end],
                )
            )

            if sentence_matches:
                last_match = sentence_matches[-1]
                sentence_end = (
                    start + last_match.end()
                )

                if sentence_end > start + (chunk_size * 0.5):
                    end = sentence_end

        # -----------------------------------------------------
        # Safety fallback
        # -----------------------------------------------------

        if end <= start:
            end = target_end

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        # -----------------------------------------------------
        # Overlap
        # -----------------------------------------------------

        next_start = end - overlap

        # Never move backwards or get stuck.
        if next_start <= start:
            next_start = end

        start = next_start

    return chunks