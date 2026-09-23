from io import BytesIO
import re

from pypdf import PdfReader

from app.services.cv_storage import CVStorageError, read_cv_bytes

MAX_EXTRACTED_TEXT_CHARS = 60000


class CVExtractionError(ValueError):
    pass


def extract_pdf_text(stored_filename: str) -> str:
    try:
        content = read_cv_bytes(stored_filename)
    except FileNotFoundError as exc:
        raise CVExtractionError("Stored CV file could not be found") from exc
    except CVStorageError as exc:
        raise CVExtractionError("Stored CV file could not be read") from exc

    try:
        reader = PdfReader(BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise CVExtractionError("CV PDF could not be read") from exc

    text = normalize_cv_text("\n".join(pages))
    if not text:
        raise CVExtractionError("CV PDF does not contain extractable text")
    return text[:MAX_EXTRACTED_TEXT_CHARS]


def normalize_cv_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
