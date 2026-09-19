from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user, require_hr_or_admin, require_roles
from app.models.user import User, UserRole
from app.schemas.interview import (
    ApplicantInterviewResponse,
    GeneratedInterviewQuestionsResponse,
    InterviewCreate,
    InterviewDetail,
    InterviewEvaluationCreate,
    InterviewEvaluationResponse,
    InterviewListItem,
    InterviewQuestionCreate,
    InterviewQuestionResponse,
    InterviewUpdate,
    InterviewerSummary,
)
from app.services.ai_analysis import AIProviderError, AIProviderUnavailable
from app.services import interviews as service

router = APIRouter(tags=["interviews"])
interviewer_only = require_roles([UserRole.INTERVIEWER])


@router.get("/hr/interviewers", response_model=list[InterviewerSummary])
def list_interviewers(
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    users = db.scalars(select(User).where(User.role == UserRole.INTERVIEWER, User.is_active.is_(True)).order_by(User.first_name, User.last_name)).all()
    return [InterviewerSummary(id=user.id, first_name=user.first_name, last_name=user.last_name, email=user.email) for user in users]


@router.post("/hr/applications/{application_id}/interviews", response_model=InterviewDetail, status_code=status.HTTP_201_CREATED)
def schedule_interview(
    application_id: int,
    interview_in: InterviewCreate,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    interview = service.create_interview(db, application_id, interview_in, current_user.id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return interview


@router.get("/hr/applications/{application_id}/interviews", response_model=list[InterviewDetail])
def get_application_interviews(
    application_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    interviews = service.list_application_interviews(db, application_id)
    if interviews is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return interviews


@router.get("/hr/interviews", response_model=list[InterviewListItem])
def list_hr_interviews(
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return service.list_hr_interviews(db)


@router.get("/hr/interviews/{interview_id}", response_model=InterviewDetail)
def get_hr_interview(
    interview_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    interview = service.get_hr_interview(db, interview_id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


@router.patch("/hr/interviews/{interview_id}", response_model=InterviewDetail)
def update_hr_interview(
    interview_id: int,
    interview_in: InterviewUpdate,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    interview = service.update_interview(db, interview_id, interview_in, current_user.id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


@router.post("/hr/interviews/{interview_id}/questions", response_model=InterviewQuestionResponse, status_code=status.HTTP_201_CREATED)
def add_hr_interview_question(
    interview_id: int,
    question_in: InterviewQuestionCreate,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    question = service.add_manual_question(db, interview_id, question_in)
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return question


@router.post("/hr/interviews/{interview_id}/questions/ai", response_model=GeneratedInterviewQuestionsResponse)
def generate_hr_interview_questions(
    interview_id: int,
    current_user: Annotated[User, Depends(require_hr_or_admin)],
    db: Annotated[Session, Depends(get_db)],
    refresh: bool = Query(default=False),
):
    try:
        questions = service.generate_ai_questions(db, interview_id, refresh)
    except AIProviderUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except AIProviderError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    if questions is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return GeneratedInterviewQuestionsResponse(questions=questions)


@router.get("/interviewer/interviews", response_model=list[InterviewListItem])
def list_my_interviews(
    current_user: Annotated[User, Depends(interviewer_only)],
    db: Annotated[Session, Depends(get_db)],
):
    return service.list_interviewer_interviews(db, current_user.id)


@router.get("/interviewer/interviews/{interview_id}", response_model=InterviewDetail)
def get_my_interview(
    interview_id: int,
    current_user: Annotated[User, Depends(interviewer_only)],
    db: Annotated[Session, Depends(get_db)],
):
    interview = service.get_interviewer_interview(db, interview_id, current_user.id)
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


@router.put("/interviewer/interviews/{interview_id}/evaluation", response_model=InterviewEvaluationResponse)
def submit_my_evaluation(
    interview_id: int,
    evaluation_in: InterviewEvaluationCreate,
    current_user: Annotated[User, Depends(interviewer_only)],
    db: Annotated[Session, Depends(get_db)],
):
    evaluation = service.upsert_evaluation(db, interview_id, current_user.id, evaluation_in)
    if evaluation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return evaluation


@router.get("/applicant/applications/{application_id}/interviews", response_model=list[ApplicantInterviewResponse])
def get_my_application_interviews(
    application_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    interviews = service.list_applicant_interviews(db, current_user.id, application_id)
    if interviews is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return interviews
