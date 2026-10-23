"""
TypeNull Document Intelligence - Structured Field Parser & Classifier
Extracts normalized candidate fields, page provenances, and supporting snippets.
"""

import re
from typing import List, Dict, Any, Optional, Tuple


def find_evidence_snippet(text: str, target: str) -> str:
    """Extract a concise surrounding context line (up to 160 chars) for human audit."""
    lines = text.split("\n")
    target_lower = target.lower()
    for line in lines:
        if target_lower in line.lower():
            return line.strip()[:160]
    return target[:160].strip()


def parse_structured_fields(
    full_text: str,
    page_texts: List[Tuple[int, str]],
    extraction_method: str = "pdf_text",
    base_confidence: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Parses candidate fields from extracted text against statutory templates:
    - Document Title
    - Registration Number (GSTIN, PAN, CIN, General)
    - Organisation / Applicant Name
    - Issue Date
    - Expiry Date
    - Issuing Authority
    - Registered Address
    """
    fields: List[Dict[str, Any]] = []

    def get_provenance(target_value: str) -> Tuple[int, str]:
        target_lower = target_value.lower()
        for page_num, p_text in page_texts:
            if target_lower in p_text.lower():
                return page_num, find_evidence_snippet(p_text, target_value)
        return 1, find_evidence_snippet(full_text, target_value)

    # 1. Document Title / Form Type
    title_catalog = [
        (r"certificate\s+of\s+incorporation", "Certificate of Incorporation"),
        (r"permanent\s+account\s+number|pan\s+card", "Permanent Account Number (PAN) Card"),
        (r"goods\s+and\s+services\s+tax|gstin", "GST Registration Certificate"),
        (r"republic\s+of\s+india\s+passport|passport", "Indian Passport"),
        (r"driving\s+licen[cs]e", "Driving Licence"),
        (r"unique\s+identification\s+authority|aadhaar", "Aadhaar Identity Card"),
        (r"memorandum\s+of\s+association", "Memorandum of Association"),
        (r"board\s+resolution", "Board Resolution Document"),
        (r"utility\s+bill|electricity\s+bill", "Utility / Address Proof Bill"),
    ]

    for pat, label in title_catalog:
        if re.search(pat, full_text, re.IGNORECASE):
            match = re.search(pat, full_text, re.IGNORECASE)
            page_num, snippet = get_provenance(match.group(0) if match else label)
            fields.append({
                "field_name": "document_title",
                "field_label": "Document Title / Form Type",
                "extracted_value": label,
                "reviewed_value": label,
                "page_number": page_num,
                "evidence_snippet": snippet,
                "extraction_method": extraction_method,
                "confidence_score": base_confidence or 0.95,
                "review_status": "needs_review",
            })
            break

    # 2. Registration Numbers (GSTIN, PAN, CIN, Reg No)
    gstin_match = re.search(r"\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b", full_text, re.IGNORECASE)
    if gstin_match:
        val = gstin_match.group(1).upper()
        page_num, snippet = get_provenance(val)
        fields.append({
            "field_name": "registration_number",
            "field_label": "GSTIN Registration ID",
            "extracted_value": val,
            "reviewed_value": val,
            "page_number": page_num,
            "evidence_snippet": snippet,
            "extraction_method": extraction_method,
            "confidence_score": 0.96,
            "review_status": "needs_review",
        })
    else:
        pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b", full_text, re.IGNORECASE)
        if pan_match:
            val = pan_match.group(1).upper()
            page_num, snippet = get_provenance(val)
            fields.append({
                "field_name": "registration_number",
                "field_label": "PAN / Tax Identification Number",
                "extracted_value": val,
                "reviewed_value": val,
                "page_number": page_num,
                "evidence_snippet": snippet,
                "extraction_method": extraction_method,
                "confidence_score": 0.95,
                "review_status": "needs_review",
            })
        else:
            cin_match = re.search(r"\b([LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b", full_text, re.IGNORECASE)
            if cin_match:
                val = cin_match.group(1).upper()
                page_num, snippet = get_provenance(val)
                fields.append({
                    "field_name": "registration_number",
                    "field_label": "Corporate Identification Number (CIN)",
                    "extracted_value": val,
                    "reviewed_value": val,
                    "page_number": page_num,
                    "evidence_snippet": snippet,
                    "extraction_method": extraction_method,
                    "confidence_score": 0.95,
                    "review_status": "needs_review",
                })
            else:
                gen_match = re.search(r"(?:registration|reg|licen[cs]e|certificate)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9/\-]{5,30})", full_text, re.IGNORECASE)
                if gen_match:
                    val = gen_match.group(1).strip()
                    page_num, snippet = get_provenance(val)
                    fields.append({
                        "field_name": "registration_number",
                        "field_label": "Registration / Licence Number",
                        "extracted_value": val,
                        "reviewed_value": val,
                        "page_number": page_num,
                        "evidence_snippet": snippet,
                        "extraction_method": extraction_method,
                        "confidence_score": min(base_confidence or 0.88, 0.88),
                        "review_status": "needs_review",
                    })

    # 3. Organisation / Applicant Name
    org_patterns = [
        r"(?:name\s+of\s+(?:the\s+)?(?:company|entity|organisation|firm|institution)|company\s+name|legal\s+name|trade\s+name)\s*[:\-]\s*([A-Za-z0-9&.,\- ]{3,60})",
        r"(?:M/s|Messrs\.?)\s+([A-Za-z0-9&.,\- ]{3,60})",
        r"(?:applicant\s+name|name\s+of\s+applicant|full\s+name)\s*[:\-]\s*([A-Za-z0-9.,\- ]{3,50})",
    ]
    for pat in org_patterns:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m and m.group(1):
            val = m.group(1).strip()
            if len(val) > 2 and "certificate" not in val.lower():
                page_num, snippet = get_provenance(val)
                fields.append({
                    "field_name": "organisation_name",
                    "field_label": "Organisation / Entity Name",
                    "extracted_value": val,
                    "reviewed_value": val,
                    "page_number": page_num,
                    "evidence_snippet": snippet,
                    "extraction_method": extraction_method,
                    "confidence_score": min(base_confidence or 0.91, 0.91),
                    "review_status": "needs_review",
                })
                break

    # 4. Issue Date
    issue_match = re.search(
        r"(?:date\s+of\s+issue|issued\s+on|date\s+of\s+incorporation|registration\s+date|issue\s+date|date)(?:\s+of\s+[a-z]+)?\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{4})",
        full_text,
        re.IGNORECASE,
    )
    if issue_match and issue_match.group(1):
        val = issue_match.group(1).strip()
        page_num, snippet = get_provenance(val)
        fields.append({
            "field_name": "issue_date",
            "field_label": "Document Issue Date",
            "extracted_value": val,
            "reviewed_value": val,
            "page_number": page_num,
            "evidence_snippet": snippet,
            "extraction_method": extraction_method,
            "confidence_score": 0.92,
            "review_status": "needs_review",
        })

    # 5. Expiry Date
    expiry_match = re.search(
        r"(?:valid\s+until|date\s+of\s+expiry|valid\s+thru|valid\s+to|expiry\s+date|expires\s+on)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{4})",
        full_text,
        re.IGNORECASE,
    )
    if expiry_match and expiry_match.group(1):
        val = expiry_match.group(1).strip()
        page_num, snippet = get_provenance(val)
        fields.append({
            "field_name": "expiry_date",
            "field_label": "Document Expiry Date",
            "extracted_value": val,
            "reviewed_value": val,
            "page_number": page_num,
            "evidence_snippet": snippet,
            "extraction_method": extraction_method,
            "confidence_score": 0.90,
            "review_status": "needs_review",
        })

    # 6. Issuing Authority
    auth_list = [
        "Ministry of Corporate Affairs",
        "Government of India",
        "Income Tax Department",
        "Goods and Services Tax Network",
        "Registrar of Companies",
        "Unique Identification Authority of India",
        "Election Commission of India",
        "Transport Department",
    ]
    for auth in auth_list:
        if re.search(re.escape(auth), full_text, re.IGNORECASE):
            page_num, snippet = get_provenance(auth)
            fields.append({
                "field_name": "issuing_authority",
                "field_label": "Issuing Authority / Regulatory Body",
                "extracted_value": auth,
                "reviewed_value": auth,
                "page_number": page_num,
                "evidence_snippet": snippet,
                "extraction_method": extraction_method,
                "confidence_score": 0.95,
                "review_status": "needs_review",
            })
            break

    # 7. Registered Address
    addr_match = re.search(
        r"(?:registered\s+office|registered\s+address|principal\s+place\s+of\s+business|address)\s*[:\-]?\s*([A-Za-z0-9,.\-/# ]{10,120})",
        full_text,
        re.IGNORECASE,
    )
    if addr_match and addr_match.group(1):
        val = re.sub(r"[\r\n]+", " ", addr_match.group(1)).strip()
        page_num, snippet = get_provenance(val)
        fields.append({
            "field_name": "address",
            "field_label": "Registered Address / Domicile",
            "extracted_value": val,
            "reviewed_value": val,
            "page_number": page_num,
            "evidence_snippet": snippet,
            "extraction_method": extraction_method,
            "confidence_score": 0.86,
            "review_status": "needs_review",
        })

    return fields


def classify_document(full_text: str) -> Dict[str, Any]:
    """Heuristic document category classifier."""
    text = full_text.lower()

    if "incorporation" in text or "registrar of companies" in text or "corporate identity number" in text:
        return {
            "type": "registration_certificate",
            "confidence": 0.96,
            "reason": "Detected incorporation statutory authority and corporate registration identifiers.",
        }

    if "gstin" in text or "goods and services tax" in text:
        return {
            "type": "registration_certificate",
            "confidence": 0.94,
            "reason": "Contains statutory GST registration certificate and tax credentials.",
        }

    if "permanent account number" in text or "income tax department" in text or "pan card" in text:
        return {
            "type": "identity_document",
            "confidence": 0.95,
            "reason": "Matches Indian Permanent Account Number (PAN) identity credential format.",
        }

    if "passport" in text or "driving licence" in text or "aadhaar" in text:
        return {
            "type": "identity_document",
            "confidence": 0.92,
            "reason": "Identified standard government identity credential patterns.",
        }

    if "electricity" in text or "utility bill" in text or "water bill" in text:
        return {
            "type": "address_proof",
            "confidence": 0.89,
            "reason": "Matches domestic utility billing and service connection address records.",
        }

    if "balance sheet" in text or "profit and loss" in text or "financial statements" in text or "tax invoice" in text:
        return {
            "type": "tax_financial_document",
            "confidence": 0.91,
            "reason": "Matches statutory accounting, tax declaration, or commercial financial statements.",
        }

    if "application form" in text or "declaration" in text:
        return {
            "type": "application_form",
            "confidence": 0.85,
            "reason": "Identified formal applicant submission structure and declaration statements.",
        }

    return {
        "type": "supporting_evidence",
        "confidence": 0.65,
        "reason": "Document contains general institutional textual evidence without distinct statutory signatures.",
    }
