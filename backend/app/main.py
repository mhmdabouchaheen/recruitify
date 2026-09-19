from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.applicant import router as applicant_router
from app.routers.applications import router as applications_router
from app.routers.contracts import router as contracts_router
from app.routers.auth import router as auth_router
from app.routers.hr_applications import router as hr_applications_router
from app.routers.interviews import router as interviews_router
from app.routers.jobs import router as jobs_router
from app.routers.public_jobs import router as public_jobs_router
from app.routers.rbac_test import router as rbac_test_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.router.include_router(auth_router)
app.router.include_router(applicant_router)
app.router.include_router(applications_router)
app.router.include_router(contracts_router)
app.router.include_router(jobs_router)
app.router.include_router(hr_applications_router)
app.router.include_router(interviews_router)
app.router.include_router(public_jobs_router)
app.router.include_router(rbac_test_router)


@app.get("/")
def root():
    return {"message": "Recruitify API is running"}

