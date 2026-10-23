# TypeNull Document Intelligence Microservice (Phase 4)

This service provides enterprise server-side document text extraction, Tesseract OCR on scanned pages, candidate field recognition, and heuristic document classification.

---

## Architecture Overview

TypeNull supports a dual-engine architecture:
1. **Frontend WebAssembly Engine** (`tesseract.js` + `pdfjs-dist`): Executes zero-install, secure client-side OCR and text extraction directly in modern browsers and runs seamlessly on Vercel frontend deployments.
2. **Backend Python Microservice** (this directory): Provides high-throughput, containerized server-side extraction using `pypdf`, `Pillow`, `pdf2image`, and `pytesseract` for cloud environments (Google Cloud Run, AWS ECS, or Docker).

---

## Local Installation

### Prerequisites
- Python 3.10+
- System packages:
  - **macOS**: `brew install tesseract poppler`
  - **Ubuntu / Debian**: `sudo apt install tesseract-ocr tesseract-ocr-eng poppler-utils`
  - **Windows**: Install Tesseract from UB-Mannheim and Poppler for Windows.

### Virtual Environment Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Server
```bash
uvicorn backend.main:app --reload --port 8000
```
Open interactive Swagger API docs at `http://localhost:8000/docs`.

---

## API Endpoints

- `GET /health`: Health check and verifies Tesseract OCR availability.
- `POST /api/extract`: Accepts multipart file upload (`file: PDF, PNG, JPG`), performs text extraction/OCR, detects structured fields with provenance snippets, and returns classified document type.
- `POST /api/classify`: Classifies raw text JSON payload into document categories.

---

## Docker Deployment (Google Cloud Run / AWS / Local)

Build and run with Docker:
```bash
docker build -t typenull-backend -f backend/Dockerfile .
docker run -p 8000:8000 typenull-backend
```

Deploying to Google Cloud Run:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/typenull-backend -f backend/Dockerfile
gcloud run deploy typenull-backend --image gcr.io/PROJECT_ID/typenull-backend --platform managed --allow-unauthenticated
```
