"""
TypeNull Document Intelligence - OCR Service
Preprocessing with Pillow and text extraction via pytesseract
"""

from typing import Tuple, Optional
import io
import re
from PIL import Image, ImageEnhance, ImageFilter

try:
    import pytesseract
except ImportError:
    pytesseract = None


def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Applies standard contrast enhancement, grayscale conversion, and slight sharpening
    to improve character edge recognition for scanned certificates and mobile camera captures.
    """
    # 1. Convert to grayscale
    img = image.convert("L")

    # 2. Resize if image is too small (boost DPI equivalent)
    if img.width < 1000 or img.height < 1000:
        scale = max(1000 / img.width, 1000 / img.height)
        new_size = (int(img.width * scale), int(img.height * scale))
        img = img.resize(new_size, Image.Resampling.LANCZOS)

    # 3. Enhance contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.8)

    # 4. Sharpen
    img = img.filter(ImageFilter.SHARPEN)

    return img


def extract_text_from_image_bytes(
    image_bytes: bytes, lang: str = "eng"
) -> Tuple[str, Optional[float]]:
    """
    Performs real OCR on an image byte stream.
    Returns (extracted_text, confidence_score).
    """
    if pytesseract is None:
        raise RuntimeError("pytesseract library is not installed in the Python runtime.")

    image = Image.open(io.BytesIO(image_bytes))
    processed = preprocess_image_for_ocr(image)

    # Retrieve detailed data to calculate true average OCR confidence
    try:
        data = pytesseract.image_to_data(processed, lang=lang, output_type=pytesseract.Output.DICT)
        text_tokens = []
        confidences = []

        for i, word in enumerate(data.get("text", [])):
            clean_word = word.strip()
            if clean_word:
                text_tokens.append(clean_word)
                conf = float(data["conf"][i])
                if conf >= 0:
                    confidences.append(conf)

        extracted_text = " ".join(text_tokens)
        avg_confidence = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.80

        # Also get formatted string with line breaks
        full_text = pytesseract.image_to_string(processed, lang=lang).strip()
        final_text = full_text if len(full_text) >= len(extracted_text) else extracted_text

        return final_text, round(avg_confidence, 3)
    except Exception as e:
        # Fallback to standard image_to_string
        full_text = pytesseract.image_to_string(processed, lang=lang).strip()
        return full_text, 0.75
