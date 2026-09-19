from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_hr_or_admin
from app.models.user import User, UserRole
from app.schemas.contract import ContractCreate, ContractResponse, ContractUpdate
from app.services.contracts import (
    contract_pdf_path,
    create_contract,
    generate_contract_pdf,
    get_applicant_contract,
    get_applicant_contract_for_application,
    get_contract_for_application,
    get_hr_contract,
    respond_to_contract,
    send_contract,
    update_contract,
)

router = APIRouter(tags=["contracts"])


@router.post("/hr/applications/{application_id}/contract", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
def create_hr_contract(
    application_id: int,
    contract_in: ContractCreate,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    contract = create_contract(db, application_id, current_user.id, contract_in)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return contract


@router.get("/hr/applications/{application_id}/contract", response_model=ContractResponse)
def get_hr_application_contract(
    application_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    contract = get_contract_for_application(db, application_id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.patch("/hr/contracts/{contract_id}", response_model=ContractResponse)
def patch_hr_contract(
    contract_id: int,
    contract_in: ContractUpdate,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    contract = update_contract(db, contract_id, contract_in)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.post("/hr/contracts/{contract_id}/generate-pdf", response_model=ContractResponse)
def generate_hr_contract_pdf(
    contract_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    contract = generate_contract_pdf(db, contract_id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.post("/hr/contracts/{contract_id}/send", response_model=ContractResponse)
def send_hr_contract(
    contract_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    contract = send_contract(db, contract_id, current_user.id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.get("/hr/contracts/{contract_id}/pdf")
def download_hr_contract_pdf(
    contract_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    contract = get_hr_contract(db, contract_id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    path = contract_pdf_path(contract)
    if path is None or not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract PDF not found")
    return FileResponse(path, media_type="application/pdf", filename=f"recruitify-contract-{contract.id}.pdf")


@router.get("/applicant/applications/{application_id}/contract", response_model=ContractResponse)
def get_applicant_application_contract(
    application_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    contract = get_applicant_contract_for_application(db, current_user.id, application_id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.get("/applicant/contracts/{contract_id}/pdf")
def download_applicant_contract_pdf(
    contract_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    contract = get_applicant_contract(db, contract_id, current_user.id)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    path = contract_pdf_path(contract)
    if path is None or not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract PDF not found")
    return FileResponse(path, media_type="application/pdf", filename=f"recruitify-contract-{contract.id}.pdf")


@router.post("/applicant/contracts/{contract_id}/accept", response_model=ContractResponse)
def accept_applicant_contract(
    contract_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    contract = respond_to_contract(db, contract_id, current_user.id, accept=True)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


@router.post("/applicant/contracts/{contract_id}/decline", response_model=ContractResponse)
def decline_applicant_contract(
    contract_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    contract = respond_to_contract(db, contract_id, current_user.id, accept=False)
    if contract is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract
