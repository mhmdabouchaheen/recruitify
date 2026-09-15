from fastapi import FastAPI

from app.routers.auth import router as auth_router
from app.routers.rbac_test import router as rbac_test_router

app = FastAPI()

app.router.include_router(auth_router)
app.router.include_router(rbac_test_router)


@app.get("/")
def root():
    return {"message": "Recruitify API is running"}
