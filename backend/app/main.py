import sys

# Force UTF-8 stdout/stderr so emoji/unicode in print() and log statements never
# crash requests on Windows, where the default console/file encoding (cp1252)
# can't represent characters like the emoji used throughout this codebase.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. IMPORT ALL MODELS FIRST: This forces SQLAlchemy to read all tables into memory at once!
from app.models.user import User
from app.models.complaint import Complaint
from app.models import jurisdiction
from app.models.assignment import Assignment
from app.models.feedback import Feedback
from app.models.resolution import Resolution

# 2. Your existing database and route imports (Kept exactly as you had them)
from app.db.database import engine, Base
from app.api import routes_citizen, routes_department, routes_worker, routes_admin, routes_complaints, auth

# ... the rest of your main.py code below ...
# ... the rest of your main.py code stays the exact same ...

# Create database tables automatically on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmartCity Connect API",
    version="1.0.0",
    description="Backend API for Smart City civic issue reporting, triage, and resolution with local AI automation."
)

# Enable CORS so your future frontend (React, Flutter, etc.) can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],  # ⚠️ In production, replace '*' with your actual frontend domain for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all role-based routers with the main application
# (routes_auth.py was removed - it duplicated auth.py's /api/auth/* endpoints,
# which are the ones the frontend actually calls, and was never wired up correctly.)
app.include_router(routes_admin.router, prefix="/admin", tags=["Admin Operations"])
app.include_router(routes_citizen.router)
app.include_router(routes_department.router)
app.include_router(routes_worker.router)
app.include_router(routes_complaints.router, prefix="/complaints", tags=["Complaints"])
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to SmartCity Connect API! The system is fully operational.",
        "docs_url": "/docs"
    }