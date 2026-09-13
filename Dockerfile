# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python FastAPI Backend & Model Pipeline
FROM python:3.10-slim

WORKDIR /app

# Install essential build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
 && rm -rf /var/lib/apt/lists/*

# Environment configurations
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SENTENCE_TRANSFORMERS_HOME=/tmp/sentence_transformers_cache \
    NLTK_DATA=/tmp/nltk_data \
    OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    TOKENIZERS_PARALLELISM=false

# Install Python dependencies (with CPU-only torch to reduce memory and image size)
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download lightweight HuggingFace model & NLTK data during build
RUN python -c "from sentence_transformers import SentenceTransformer; import nltk; \
    SentenceTransformer('all-MiniLM-L6-v2'); \
    nltk.download('punkt_tab', download_dir='/tmp/nltk_data')"

# Copy backend application source code
COPY . .

# Copy compiled frontend dist from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port 8000
EXPOSE 8000

# Run Uvicorn server (supports Render dynamic $PORT or defaults to 8000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
