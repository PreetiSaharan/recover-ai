from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.db.session import engine
from app.api.routes.auth import router as auth_router
from app.api.routes import borrowers
from app.api.routes import uploads
from app.models.nbfc import Nbfc
from app.api.routes import interactions
from app.api.routes import users
from app.api.routes import assignments


app = FastAPI(
    title="RecoverAI",
    description="AI-powered loan collections platform for Indian NBFCs",
    version="1.0.0",
)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],  # React dev server
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://recover-ai-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(borrowers.router, prefix="/borrowers", tags=["borrowers"])
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
app.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(assignments.router, prefix="/assignments", tags=["assignments"])

@app.get("/")
def root():
    return {"message": "RecoverAI API is running"}


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy",
        "database": db_status,
    }