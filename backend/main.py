"""
TypeNull Document Intelligence Processing Microservice
FastAPI application for server-side PDF and image text extraction,
candidate field detection, and heuristic document classification.
"""

from typing import Dict, Any, List
import io
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.services.pdf_extractor import extract_from_pdf_bytes
from backend.services.ocr_service import extract_text_from_image_bytes
from backend.services.field_parser import parse_structured_fields, classify_document

app = FastAPI(
    title="TypeNull Document Intelligence Service",
    description="High-precision OCR and structured field extraction pipeline for regulatory document validation.",
    version="1.0.0",
)

# Enable CORS for local development and Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    tesseract_available: bool


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Service health and capability verification."""
    try:
        import pytesseract
        pytesseract_ok = True
    except ImportError:
        pytesseract_ok = False

    return {
        "status": "healthy",
        "service": "typenull-document-intelligence",
        "version": "1.0.0",
        "tesseract_available": pytesseract_ok,
    }


@app.post("/api/extract")
async def extract_document(
    file: UploadFile = File(...),
):
    """
    Extracts embedded and OCR text from an uploaded document (PDF, PNG, JPG),
    identifies structured candidate fields with evidence snippets, and provides
    heuristic document classification.
    """
    filename = file.filename or "uploaded_file"
    content_type = file.content_type or ""
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    is_pdf = content_type == "application/pdf" or filename.lower().endswith(".pdf")
    is_image = (
        content_type.startswith("image/")
        or filename.lower().endswith((".png", ".jpg", ".jpeg"))
    )

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=415,
            detail="Unsupported format. Only PDF, JPEG, and PNG are supported.",
        )

    try:
        if is_pdf:
            pdf_res = extract_from_pdf_bytes(file_bytes)
            full_text = pdf_res["full_text"]
            page_texts = pdf_res["page_texts"]
            method = pdf_res["method"]
            page_count = pdf_res["page_count"]
            confidence = pdf_res["overall_confidence"]
        else:
            img_text, img_conf = extract_text_from_image_bytes(file_bytes)
            full_text = img_text
            page_texts = [(1, img_text)]
            method = "ocr"
            page_count = 1
            confidence = img_conf

        # Parse structured candidate fields
        fields = parse_structured_fields(
            full_text,
            page_texts,
            extraction_method=method,
            base_confidence=confidence,
        )

        # Classification
        classification = classify_document(full_text)

        return {
            "success": True,
            "filename": filename,
            "mime_type": content_type,
            "page_count": page_count,
            "extraction_method": method,
            "overall_confidence": confidence,
            "raw_text": full_text,
            "fields": fields,
            "classification": classification,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document extraction failed: {str(e)}")


@app.post("/api/classify")
async def classify_raw_text(payload: Dict[str, str]):
    """Classifies raw text without requiring full document upload."""
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'text' key in request payload.")

    classification = classify_document(text)
    return {"success": True, "classification": classification}
