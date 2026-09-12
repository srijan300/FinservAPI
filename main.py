# main.py
# To run this code:
# 1. Create a .env file with your GENAI_KEY
# 2. Install dependencies from requirements.txt: pip install -r requirements.txt
# 3. Run the server: uvicorn main:app --reload

import os
from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Import the RAG logic
from rag_pipeline import RAGPipeline

# --- Environment and Configuration ---
load_dotenv() # Load environment variables from a .env file

# Load secrets and configs from environment variables
# In a real app, use a more robust secrets management system.
SECURITY_TOKEN = os.getenv("SECURITY_TOKEN", "128c33fc16f4a70cab19dab48958d5bf246e7003a8bfd7eb0be2f617b48e662a")
GENAI_KEY = os.getenv("GENAI_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


# This dictionary will hold our initialized RAG pipeline instance.
# It's populated during the 'startup' event.
ml_models = {}

# --- Lifespan Management (for model loading) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the application's lifespan. The 'startup' part loads the ML model,
    and the 'shutdown' part can be used for cleanup.
    """
    print("--- Server starting up ---")
    has_valid_gemini = GENAI_KEY and GENAI_KEY.startswith("AIzaSy")
    has_valid_openai = OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-")

    if has_valid_gemini:
        ml_models["rag_pipeline"] = RAGPipeline(gemini_api_key=GENAI_KEY, openai_api_key=OPENAI_API_KEY if has_valid_openai else None)
        print("--- RAG Pipeline Initialized (Google Gemini API - Primary) ---")
    elif has_valid_openai:
        ml_models["rag_pipeline"] = RAGPipeline(openai_api_key=OPENAI_API_KEY)
        print("--- RAG Pipeline Initialized (OpenAI API - Active) ---")
    elif GENAI_KEY and GENAI_KEY != "your-gemini-api-key-here":
        ml_models["rag_pipeline"] = RAGPipeline(gemini_api_key=GENAI_KEY, openai_api_key=OPENAI_API_KEY if has_valid_openai else None)
        print("--- RAG Pipeline Initialized (Google Gemini API) ---")
    else:
        print("WARNING: Neither GEMINI_API_KEY nor OPENAI_API_KEY is properly set.")
    yield
    # Clean up the ML models and release the resources
    print("--- Server shutting down ---")
    ml_models.clear()

# --- Pydantic Models for API Data Validation ---
class SubmissionRequest(BaseModel):
    documents: str = Field(..., example="https://hackrx.blob.core.windows.net/assets/policy.pdf?...")
    questions: List[str]

class SubmissionResponse(BaseModel):
    answers: List[str]

class SuggestionRequest(BaseModel):
    documents: str

class SuggestionResponse(BaseModel):
    questions: List[str]

# --- Security Dependency ---
security_scheme = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """Dependency to verify the Bearer token."""
    if credentials.scheme != "Bearer" or credentials.credentials != SECURITY_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token",
        )
    print("SUCCESS: Team token loaded successfully")

from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, Header, File, UploadFile

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)

# --- API Router and Endpoints ---
api_router = APIRouter(prefix="/api/v1")

@api_router.post("/upload", summary="Upload document for live parsing")
async def upload_document(file: UploadFile = File(...)):
    file_path = os.path.join(uploads_dir, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"filename": file.filename, "file_path": file_path, "url": f"http://localhost:8000/uploads/{file.filename}"}

@api_router.post("/suggest-questions", response_model=SuggestionResponse, summary="Generate AI-based questions from document text")
async def suggest_questions(request_data: SuggestionRequest):
    if "rag_pipeline" not in ml_models:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RAG Pipeline not initialized."
        )
    pipeline: RAGPipeline = ml_models["rag_pipeline"]
    try:
        qs = pipeline.generate_ai_suggested_questions(request_data.documents)
        return SuggestionResponse(questions=qs)
    except Exception as e:
        err_msg = str(e)
        safe_msg = err_msg.encode('ascii', 'ignore').decode('ascii')
        print(f"Error generating AI questions: {safe_msg}")
        status_code = status.HTTP_429_TOO_MANY_REQUESTS if ("429" in err_msg or "quota" in err_msg.lower()) else status.HTTP_500_INTERNAL_SERVER_ERROR
        raise HTTPException(
            status_code=status_code,
            detail=err_msg
        )

@api_router.post(
    "/hackrx/run",
    response_model=SubmissionResponse,
    summary="Run Submissions against a Document",
    dependencies=[Depends(verify_token)] # Protect the endpoint
)
async def run_submission(request_data: SubmissionRequest):
    """
    This endpoint processes a document and answers questions about it.
    1. It takes a document URL and a list of questions.
    2. It processes the document to build the internal knowledge base (if not already processed).
    3. It uses the RAG pipeline to generate answers.
    """
    if "rag_pipeline" not in ml_models:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY is not configured in .env file. Please add your key."
        )
    pipeline: RAGPipeline = ml_models["rag_pipeline"]
    
    try:
        # For simplicity, we re-process the document on each call.
        # In a more advanced setup, you might cache results based on the URL.
        pipeline.process_document(request_data.documents)
        
        # Generate answers to the questions
        answers = pipeline.answer_questions(request_data.questions)
        
        return SubmissionResponse(answers=answers)
        
    except Exception as e:
        # Log the error for debugging
        print(f"An error occurred: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred while processing the request: {str(e)}"
        )
    
@api_router.get('/')
def read_welcome():
    return {"Greet": "Welcome to Bajaj Finserv"}

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# --- Main FastAPI App ---
app = FastAPI(
    title="Document Q&A API with RAG",
    description="An API that uses a Retrieval-Augmented Generation pipeline to answer questions about a document.",
    version="1.0.0",
    lifespan=lifespan # Use the lifespan manager for model loading
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="static_assets")

    @app.get("/", summary="FinServe UI Platform")
    def read_root():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

@app.get("/health", summary="Health Check")
def read_health():
    return {"status": "API is running."}