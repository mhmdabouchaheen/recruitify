from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.application import Application, ApplicationActivity, ApplicationStatus
from app.models.contract import Contract, ContractStatus
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractResponse, ContractUpdate

CONTRACT_STORAGE_ROOT = Path(__file__).resolve().parents[2] / "uploads" / "contracts"
PDF_SIGNATURE = b"%PDF-"


def _load_contract_options():
    return (
        selectinload(Contract.application).selectinload(Application.applicant),
        selectinload(Contract.application).selectinload(Application.job),
    )


def _response(contract: Contract) -> ContractResponse:
    data = ContractResponse.model_validate(contract, from_attributes=True)
    data.has_pdf = bool(contract.pdf_filename)
    return data


def _get_contract(db: Session, contract_id: int) -> Contract | None:
    return db.scalar(select(Contract).options(*_load_contract_options()).where(Contract.id == contract_id))


def get_contract_for_application(db: Session, application_id: int) -> ContractResponse | None:
    contract = db.scalar(select(Contract).options(*_load_contract_options()).where(Contract.application_id == application_id))
    return _response(contract) if contract else None


def get_applicant_contract_for_application(db: Session, applicant_id: int, application_id: int) -> ContractResponse | None:
    contract = db.scalar(
        select(Contract)
        .join(Contract.application)
        .options(*_load_contract_options())
        .where(Contract.application_id == application_id, Application.applicant_id == applicant_id, Contract.status.in_([ContractStatus.SENT, ContractStatus.ACCEPTED, ContractStatus.DECLINED]))
    )
    return _response(contract) if contract else None


def create_contract(db: Session, application_id: int, created_by_id: int, data: ContractCreate) -> ContractResponse | None:
    application = db.scalar(select(Application).options(selectinload(Application.job), selectinload(Application.applicant)).where(Application.id == application_id))
    if application is None:
        return None
    if application.status != ApplicationStatus.SELECTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contracts can only be prepared for selected applications")
    contract = Contract(application_id=application_id, created_by_id=created_by_id, status=ContractStatus.DRAFT, **data.model_dump())
    try:
        db.add(contract)
        db.flush()
        db.add(ApplicationActivity(application_id=application_id, actor_id=created_by_id, event_type="contract_prepared"))
        db.commit()
        loaded = _get_contract(db, contract.id)
        return _response(loaded) if loaded else None
    except IntegrityError as exc:
        db.rollback()
        existing = get_contract_for_application(db, application_id)
        if existing:
            return existing
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Contract already exists for this application") from exc
    except SQLAlchemyError:
        db.rollback()
        raise


def update_contract(db: Session, contract_id: int, data: ContractUpdate) -> ContractResponse | None:
    contract = _get_contract(db, contract_id)
    if contract is None:
        return None
    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft contracts can be edited")
    values = data.model_dump(exclude_unset=True)
    next_start = values.get("start_date", contract.start_date)
    next_end = values.get("end_date", contract.end_date)
    if next_end and next_end < next_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date cannot be before start date")
    if values.get("salary_amount") is not None and values.get("salary_currency", contract.salary_currency) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Salary currency is required when salary amount is provided")
    for key, value in values.items():
        setattr(contract, key, value)
    # Terms changed; require deliberate regeneration before sending.
    contract.pdf_filename = None
    try:
        db.add(contract)
        db.commit()
        loaded = _get_contract(db, contract_id)
        return _response(loaded) if loaded else None
    except SQLAlchemyError:
        db.rollback()
        raise


def generate_contract_pdf(db: Session, contract_id: int) -> ContractResponse | None:
    contract = _get_contract(db, contract_id)
    if contract is None:
        return None
    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft contracts can regenerate PDFs")
    CONTRACT_STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    filename = f"contract-{contract.id}-{uuid4().hex}.pdf"
    destination = CONTRACT_STORAGE_ROOT / filename
    pdf_bytes = _build_pdf(contract)
    if not pdf_bytes.startswith(PDF_SIGNATURE):
        raise RuntimeError("Generated contract PDF is invalid")
    destination.write_bytes(pdf_bytes)
    old_path = contract_pdf_path(contract) if contract.pdf_filename else None
    try:
        contract.pdf_filename = filename
        db.add(contract)
        db.commit()
        if old_path and old_path.exists() and old_path.parent == CONTRACT_STORAGE_ROOT:
            old_path.unlink()
        loaded = _get_contract(db, contract_id)
        return _response(loaded) if loaded else None
    except SQLAlchemyError:
        db.rollback()
        if destination.exists():
            destination.unlink()
        raise


def send_contract(db: Session, contract_id: int, actor_id: int) -> ContractResponse | None:
    contract = _get_contract(db, contract_id)
    if contract is None:
        return None
    if contract.status != ContractStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft contracts can be sent")
    path = contract_pdf_path(contract)
    if path is None or not path.exists():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Generate the contract PDF before sending")
    try:
        contract.status = ContractStatus.SENT
        contract.sent_at = datetime.now(timezone.utc)
        db.add(contract)
        db.add(ApplicationActivity(application_id=contract.application_id, actor_id=actor_id, event_type="contract_sent"))
        db.commit()
        loaded = _get_contract(db, contract_id)
        return _response(loaded) if loaded else None
    except SQLAlchemyError:
        db.rollback()
        raise


def respond_to_contract(db: Session, contract_id: int, applicant_id: int, accept: bool) -> ContractResponse | None:
    contract = db.scalar(
        select(Contract).join(Contract.application).options(*_load_contract_options()).where(Contract.id == contract_id, Application.applicant_id == applicant_id)
    )
    if contract is None:
        return None
    if contract.status != ContractStatus.SENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This contract has already been responded to or is not available")
    try:
        contract.status = ContractStatus.ACCEPTED if accept else ContractStatus.DECLINED
        contract.responded_at = datetime.now(timezone.utc)
        db.add(contract)
        db.add(ApplicationActivity(application_id=contract.application_id, actor_id=applicant_id, event_type="contract_accepted" if accept else "contract_declined"))
        db.commit()
        loaded = _get_contract(db, contract_id)
        return _response(loaded) if loaded else None
    except SQLAlchemyError:
        db.rollback()
        raise


def get_hr_contract(db: Session, contract_id: int) -> Contract | None:
    return _get_contract(db, contract_id)


def get_applicant_contract(db: Session, contract_id: int, applicant_id: int) -> Contract | None:
    return db.scalar(
        select(Contract).join(Contract.application).options(*_load_contract_options()).where(Contract.id == contract_id, Application.applicant_id == applicant_id, Contract.status.in_([ContractStatus.SENT, ContractStatus.ACCEPTED, ContractStatus.DECLINED]))
    )


def contract_pdf_path(contract: Contract) -> Path | None:
    if not contract.pdf_filename:
        return None
    filename = Path(contract.pdf_filename).name
    path = (CONTRACT_STORAGE_ROOT / filename).resolve()
    root = CONTRACT_STORAGE_ROOT.resolve()
    if path.parent != root:
        return None
    return path


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _format_date(value) -> str:
    return value.strftime("%B %d, %Y") if value else "Not applicable"


def _label(value: str) -> str:
    return value.replace("_", " ").title()


def _contract_sections(contract: Contract) -> list[tuple[str, list[tuple[str, str] | str]]]:
    application = contract.application
    applicant = application.applicant
    job = application.job
    salary = "Not specified"
    if contract.salary_amount is not None and contract.salary_currency:
        salary = f"{contract.salary_amount:,.2f} {contract.salary_currency}"
    return [
        ("Candidate", [
            ("Name", f"{applicant.first_name} {applicant.last_name}"),
            ("Position", job.title),
            ("Department", job.department),
        ]),
        ("Employment Details", [
            ("Contract type", _label(contract.contract_type.value)),
            ("Start date", _format_date(contract.start_date)),
            ("End date", _format_date(contract.end_date) if contract.end_date else "Not applicable"),
            ("Work location", contract.work_location),
            ("Probation period", contract.probation_period or "Not specified"),
        ]),
        ("Compensation", [("Salary", salary)]),
        ("Additional Terms", [contract.additional_terms or "No additional terms specified."]),
        ("Acceptance", ["The candidate may accept or decline this offer inside Recruitify."]),
    ]


def _wrap_line(text: str, limit: int = 88) -> list[str]:
    words = str(text or "").split()
    if not words:
        return [""]
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) > limit and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def _pdf_text(x: int, y: int, text: str, font: str = "F1", size: int = 10, color: str = "0 0 0") -> str:
    return f"BT {color} rg /{font} {size} Tf {x} {y} Td ({_escape_pdf_text(str(text))}) Tj ET"


def _pdf_line(x1: int, y1: int, x2: int, y2: int, color: str = "0.82 0.87 0.84", width: str = "0.7") -> str:
    return f"q {color} RG {width} w {x1} {y1} m {x2} {y2} l S Q"


def _pdf_rect(x: int, y: int, width: int, height: int, color: str = "0.96 0.98 0.96") -> str:
    return f"q {color} rg {x} {y} {width} {height} re f Q"


def _build_pdf(contract: Contract) -> bytes:
    company = getattr(settings, "contract_company_name", None) or "Recruitify"
    pages: list[list[str]] = []
    ops: list[str] = []
    y = 742

    def new_page() -> None:
        nonlocal ops, y
        if ops:
            ops.append(_pdf_line(48, 58, 564, 58, "0.88 0.91 0.89", "0.5"))
            ops.append(_pdf_text(226, 40, "Generated through Recruitify", "F1", 9, "0.42 0.48 0.44"))
            pages.append(ops)
        ops = []
        y = 742
        ops.append(_pdf_rect(0, 724, 612, 68, "0.10 0.16 0.13"))
        ops.append(_pdf_text(48, 760, "RECRUITIFY", "F2", 18, "1 1 1"))
        ops.append(_pdf_text(48, 738, "Employment Contract / Offer", "F1", 12, "0.82 0.90 0.85"))
        ops.append(_pdf_text(408, 742, f"Generated {_format_date(datetime.now(timezone.utc).date())}", "F1", 9, "0.82 0.90 0.85"))
        y = 692

    def ensure_space(height: int) -> None:
        nonlocal y
        if y - height < 78:
            new_page()

    new_page()
    ops.append(_pdf_text(48, y, "Employer", "F2", 10, "0.23 0.32 0.26"))
    ops.append(_pdf_text(154, y, company, "F1", 10, "0.18 0.22 0.19"))
    y -= 24
    ops.append(_pdf_line(48, y, 564, y))
    y -= 28

    for title, rows in _contract_sections(contract):
        ensure_space(72)
        ops.append(_pdf_text(48, y, title, "F2", 13, "0.15 0.30 0.21"))
        y -= 10
        ops.append(_pdf_line(48, y, 564, y, "0.73 0.82 0.76", "1"))
        y -= 22
        for row in rows:
            if isinstance(row, tuple):
                label, value = row
                wrapped = _wrap_line(value, 68)
                ensure_space(max(22, 14 * len(wrapped) + 6))
                ops.append(_pdf_text(58, y, label, "F2", 9, "0.36 0.42 0.38"))
                for index, line in enumerate(wrapped):
                    ops.append(_pdf_text(178, y - (index * 14), line, "F1", 10, "0.17 0.20 0.18"))
                y -= max(22, 14 * len(wrapped) + 6)
            else:
                for line in _wrap_line(row, 92):
                    ensure_space(16)
                    ops.append(_pdf_text(58, y, line, "F1", 10, "0.17 0.20 0.18"))
                    y -= 15
                y -= 4
        y -= 14

    ops.append(_pdf_line(48, 58, 564, 58, "0.88 0.91 0.89", "0.5"))
    ops.append(_pdf_text(226, 40, "Generated through Recruitify", "F1", 9, "0.42 0.48 0.44"))
    pages.append(ops)

    objects: list[bytes] = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    ]
    page_object_numbers = []
    content_object_numbers = []
    next_obj = 3
    for _ in pages:
        page_object_numbers.append(next_obj)
        content_object_numbers.append(next_obj + 1)
        next_obj += 2
    font_regular_obj = next_obj
    font_bold_obj = next_obj + 1

    kids = " ".join(f"{num} 0 R" for num in page_object_numbers).encode()
    objects.append(b"2 0 obj << /Type /Pages /Kids [" + kids + b"] /Count " + str(len(pages)).encode() + b" >> endobj\n")
    for page_num, content_num, page_ops in zip(page_object_numbers, content_object_numbers, pages):
        stream = "\n".join(page_ops).encode("latin-1", errors="replace")
        objects.append(f"{page_num} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_regular_obj} 0 R /F2 {font_bold_obj} 0 R >> >> /Contents {content_num} 0 R >> endobj\n".encode())
        objects.append(f"{content_num} 0 obj << /Length {len(stream)} >> stream\n".encode() + stream + b"\nendstream endobj\n")
    objects.append(f"{font_regular_obj} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n".encode())
    objects.append(f"{font_bold_obj} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n".encode())

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer << /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode())
    return bytes(pdf)
