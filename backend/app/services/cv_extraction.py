from pathlib import Path
import re

from pypdf import PdfReader

from app.services.applicants import UPLOAD_ROOT

MAX_EXTRACTED_TEXT_CHARS = 60000


class CVExtractionError(ValueError):
    pass


def extract_pdf_text(stored_filename: str) -> str:
    safe_name = Path(stored_filename).name
    path = UPLOAD_ROOT / safe_name
    if not path.exists() or not path.is_file() or path.parent != UPLOAD_ROOT:
        raise CVExtractionError("Stored CV file could not be found")

    try:
        reader = PdfReader(str(path))
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
