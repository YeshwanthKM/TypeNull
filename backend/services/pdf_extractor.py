"""
TypeNull Document Intelligence - PDF Text Extractor
Uses pypdf for digital text and pdf2image + pytesseract for scanned pages.
"""

from typing import List, Tuple, Dict, Any
import io
from pypdf import PdfReader
from backend.services.ocr_service import extract_text_from_image_bytes

try:
    from pdf2image import convert_from_bytes
except ImportError:
    convert_from_bytes = None

MAX_PDF_PAGES_TO_PROCESS = 10


def extract_from_pdf_bytes(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts text from PDF bytes.
    Extracts embedded digital text first; if a page is scanned (< 30 characters),
    it converts the page to an image and runs OCR.
    """
    reader = PdfReader(io.BytesIO(pdf_bytes))
    total_pages = min(len(reader.pages), MAX_PDF_PAGES_TO_PROCESS)

    page_texts: List[Tuple[int, str]] = []
    ocr_used = False
    digital_used = False
    confidences: List[float] = []

    for idx in range(total_pages):
        page_num = idx + 1
        page = reader.pages[idx]
        extracted_text = (page.extract_text() or "").strip()

        if len(extracted_text) >= 30:
            digital_used = True
            page_texts.append((page_num, extracted_text))
            confidences.append(0.98)
        else:
            # Scanned page fallback
            if convert_from_bytes is not None:
                try:
                    images = convert_from_bytes(
                        pdf_bytes, first_page=page_num, last_page=page_num
                    )
                    if images:
                        img_buf = io.BytesIO()
                        images[0].save(img_buf, format="PNG")
                        ocr_text, ocr_conf = extract_text_from_image_bytes(img_buf.getvalue())
                        ocr_used = True
                        page_texts.append((page_num, ocr_text))
                        if ocr_conf:
                            confidences.append(ocr_conf)
                        continue
                except Exception as e:
                    # Could not render with pdf2image (e.g. poppler missing)
                    pass

            # If OCR failed or pdf2image was not available, record what was extracted
            page_texts.append((page_num, extracted_text))

    full_text = "\n\n".join(t for _, t in page_texts)
    method = (
        "hybrid"
        if (ocr_used and digital_used)
        else "ocr"
        if ocr_used
        else "pdf_text"
    )
    overall_confidence = (sum(confidences) / len(confidences)) if confidences else 0.90

    return {
        "full_text": full_text,
        "page_texts": page_texts,
        "method": method,
        "page_count": total_pages,
        "overall_confidence": round(overall_confidence, 3),
    }
