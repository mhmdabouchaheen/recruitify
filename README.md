# Recruitify

Recruitify is a Smart Recruitment & Applicant Tracking System (ATS) built as a full-stack capstone project. It supports a complete recruitment workflow for applicants, HR teams, interviewers, and administrators, from job publishing through applications, AI-assisted candidate matching, interviews, contracts, and hired outcomes.

- Live frontend: https://recruitify-nu.vercel.app
- Backend API: https://recruitify-api-vu40.onrender.com

## Overview

Recruitify helps organizations manage job vacancies, receive candidate applications, analyze CVs, track applicants through a hiring pipeline, schedule interviews, collect interviewer evaluations, prepare contracts, and report on recruitment activity.

The AI features are advisory. Recruitify calculates and presents AI-assisted insights to help HR review candidates more efficiently, but HR users remain responsible for all final hiring decisions.

## Roles

Recruitify currently supports four roles:

| Role | Capabilities |
|---|---|
| Applicant | Browse public careers page, register/login, manage profile and CVs, apply to published jobs, answer job questions, view applications, withdraw eligible applications, view interviews/contracts/notifications. |
| HR | Manage jobs, review candidates, move applications through the pipeline, trigger AI analysis, schedule interviews, generate AI interview questions, prepare/send contracts, view reports and dashboard analytics. |
| Interviewer | View assigned interviews, review prepared questions, submit interview evaluations. |
| Admin | Manage internal users, roles, and account active/inactive state; access HR-level recruitment areas. |

## Implemented recruitment workflow

Recruitify implements this end-to-end flow:

1. HR/Admin creates and publishes a job vacancy.
2. Visitors browse published jobs on the public Careers page.
3. Applicants register, upload/manage CVs, and apply to published jobs.
4. Applications store job-question answers and the selected applicant CV.
5. HR reviews applications in Candidate Management and Pipeline views.
6. Recruitify performs AI-assisted CV analysis and candidate-job matching.
7. HR shortlists candidates and schedules interviews.
8. Interviewers review assigned interviews and submit evaluations.
9. HR marks candidates as selected or rejected.
10. HR prepares and sends contracts for selected candidates.
11. Applicants accept or decline contracts.
12. A candidate is considered hired when the application is selected and the related contract is accepted.

## AI features

Recruitify includes AI-assisted recruitment tools:

- CV text extraction and structured CV analysis.
- Candidate-job matching based on the applicant CV and configured job skills/requirements.
- AI-generated interview questions for scheduled interviews.

The candidate match score is calculated with this weighting:

| Category | Weight |
|---|---:|
| Skills | 60% |
| Experience | 25% |
| Education | 15% |

AI output is used as decision support only. HR users make the final recruitment decisions.

## Core features

### Public applicant experience

- Public Careers page at `/careers`.
- Public job details at `/careers/:jobId`.
- Applicant registration and login.
- Applicant profile management.
- CV upload, primary CV selection, deletion, and safe CV replacement for already-referenced applications.
- Job application submission with required question validation.
- My Applications page.
- Application details, interview schedule visibility, contract visibility, and withdrawal where allowed.

### HR recruitment management

- HR Overview dashboard with real recruitment data.
- Job Management with create, edit, publish, close, archive, delete, preview, skills, and application questions.
- Candidate Management with filters, statuses, AI match scores, details, notes, activity history, and AI analysis.
- Recruitment Pipeline with status transitions and contract-aware selected/hired logic.
- Interview Management with calendar, upcoming interviews, all interviews table, scheduling, rescheduling, cancellation, questions, AI question generation, and evaluations.
- Contract workflow with PDF generation, sending, applicant acceptance/decline, and hired outcome support.
- Reports & Analytics based on real recruitment data.
- In-app notifications and unread counts.

### Admin user management

- Admin-only `/admin/users` page.
- List/search/filter users.
- Create internal users: Admin, HR, Interviewer.
- Change roles.
- Activate/deactivate users.
- Safety rules prevent removing the final active admin or deactivating yourself.

## Reports & Analytics

Recruitify includes HR reporting for:

- Recruitment funnel.
- Applications over time.
- Applications by status.
- Applications by department.
- Job performance.
- AI match score distribution.
- Interview outcomes.
- Contract outcomes.
- Hires over time.
- Key insights based on real data.
- PDF report export.

## Security and RBAC

- JWT access-token authentication.
- Password hashing with `pwdlib`.
- Public registration creates applicants only.
- Backend-enforced role-based access control.
- HR/Admin-only job and candidate management APIs.
- Admin-only user management APIs.
- Applicant-only applicant profile, CV, and application APIs.
- Interviewer access restricted to assigned interview workflows.
- CORS configured through environment variables.
- Real secrets are excluded from Git and loaded through environment variables.

## Tech stack

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS v4
- shadcn/Base UI setup
- Lucide React icons
- Recharts
- DM Sans font

### Backend

- FastAPI
- SQLAlchemy 2.x
- Alembic migrations
- PostgreSQL
- Pydantic v2
- JWT authentication with PyJWT
- Password hashing with pwdlib
- Google Gemini SDK for AI features
- pypdf for CV text extraction
- boto3-compatible object storage for persistent CV storage

### Deployment

- Frontend: Vercel
- Backend API: Render
- Database: PostgreSQL, configured through `DATABASE_URL`
- CV storage: local development storage or S3-compatible object storage in production

## Project structure

```text
recruitify/
├── backend/
│   ├── alembic/                 # Database migrations
│   ├── app/
│   │   ├── core/                # Settings/configuration
│   │   ├── db/                  # SQLAlchemy session/base
│   │   ├── dependencies/        # Auth/RBAC dependencies
│   │   ├── models/              # SQLAlchemy models
│   │   ├── routers/             # FastAPI routers
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic/services
│   │   └── main.py              # FastAPI app entrypoint
│   ├── scripts/                 # Utility scripts
│   ├── uploads/                 # Local development upload storage
│   ├── .env.example
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/                 # Frontend API modules
│   │   ├── components/          # Shared components
│   │   ├── context/             # Auth/jobs context
│   │   ├── layouts/             # App shell/navigation
│   │   ├── lib/                 # API client/token helpers
│   │   ├── pages/               # Route pages
│   │   └── App.jsx
│   ├── .env.example
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Local setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL
- Git

### Backend setup

From the repository root:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Update `.env` with your local PostgreSQL connection and placeholders described below.

Run migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

The local backend runs at:

```text
http://127.0.0.1:8000
```

### Frontend setup

From the repository root:

```bash
cd frontend
npm install
```

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

The local frontend usually runs at:

```text
http://127.0.0.1:5173
```

## Environment variables

Use placeholders only in committed files. Never commit real secrets.

### Backend `.env`

```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/recruitify
SECRET_KEY=replace-with-a-long-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

AI_PROVIDER=gemini
AI_MODEL=replace-with-gemini-model-name
AI_API_KEY=replace-with-ai-api-key

CONTRACT_COMPANY_NAME=Recruitify

CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,https://recruitify-nu.vercel.app

CV_STORAGE_BACKEND=local
CV_STORAGE_BUCKET=assets
CV_STORAGE_PREFIX=cvs
CV_STORAGE_FORCE_PATH_STYLE=true
AWS_ENDPOINT_URL_S3=https://your-s3-compatible-endpoint.example
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=replace-with-access-key-id
AWS_SECRET_ACCESS_KEY=replace-with-secret-access-key

SMTP_EMAIL=your-gmail-address@example.com
SMTP_APP_PASSWORD=your-app-password
```

Notes:

- `DATABASE_URL`, `SECRET_KEY`, and JWT settings are required for the API.
- `AI_API_KEY` and related AI settings are required for Gemini-powered AI features.
- `CV_STORAGE_BACKEND=local` is suitable for local development.
- Use S3-compatible object storage settings for persistent production CV storage.
- `SMTP_EMAIL` and `SMTP_APP_PASSWORD` are present in configuration for optional SMTP email attempts, but the core implemented notification system is in-app notifications.

### Frontend `.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

For production, this points to:

```env
VITE_API_BASE_URL=https://recruitify-api-vu40.onrender.com
```

## Useful commands

Backend:

```bash
cd backend
alembic upgrade head
uvicorn app.main:app --reload
python -m compileall app
```

Frontend:

```bash
cd frontend
npm run dev
npm run lint
npm run build
```

## Short demo workflow

1. Open the frontend at https://recruitify-nu.vercel.app.
2. Browse public jobs at `/careers`.
3. Register or log in as an applicant.
4. Complete the applicant profile and upload a CV.
5. Apply to a published job and answer required questions.
6. Log in as HR/Admin.
7. Review the new application in Candidates or Pipeline.
8. Run or view AI candidate-job matching.
9. Move the candidate through shortlist and interview stages.
10. Schedule an interview and generate AI interview questions.
11. Log in as an interviewer and submit an evaluation.
12. Select the candidate, prepare/send a contract, and accept it as the applicant.
13. View hired outcome and reports.

## Final scope

Implemented:

- Applicant registration/login/profile/CV/application workflow.
- Public Careers browsing.
- HR job management.
- HR candidate management and recruitment pipeline.
- AI CV analysis, matching, and interview-question support.
- Interview scheduling and interviewer evaluations.
- Contract generation/sending/acceptance/decline.
- Admin user management.
- In-app notifications.
- Dashboard and reports analytics.
- JWT authentication and role-based access control.

Not included in the current scope:

- Public company career-site customization beyond the implemented Careers page.
- OAuth/social login.
- Forgot-password and email verification flows.
- Calendar provider integration.
- Real-time chat or messaging.
- External HRIS/payroll integrations.
- Automated AI hiring decisions.
- Saved jobs as a complete persisted feature.
