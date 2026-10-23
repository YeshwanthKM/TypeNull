import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ApplicationDocument,
  DocumentCategory,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  ExtractionMethod,
  FieldReviewStatus,
} from '../types';
import { STORAGE_BUCKET } from './documents';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Maximum pages processed per document to prevent browser resource exhaustion
 */
export const MAX_PDF_PAGES_TO_PROCESS = 10;

export interface ExtractedPageContent {
  pageNumber: number;
  text: string;
  method: 'pdf_text' | 'ocr';
  confidence?: number;
}

export interface ExtractionResult {
  rawText: string;
  pages: ExtractedPageContent[];
  method: ExtractionMethod;
  pageCount: number;
  overallConfidence: number | null;
  fields: Array<{
    fieldName: string;
    fieldLabel: string;
    extractedValue: string;
    pageNumber: number;
    evidenceSnippet: string;
    extractionMethod: string;
    confidenceScore: number | null;
  }>;
  classification: {
    type: DocumentCategory;
    confidence: number;
    reason: string;
  };
}

/**
 * Parse structured fields from extracted text using heuristic catalog
 */
export function parseStructuredFields(
  fullText: string,
  pages: ExtractedPageContent[],
  baseMethod: ExtractionMethod,
  overallConfidence: number | null
): ExtractionResult['fields'] {
  const fields: ExtractionResult['fields'] = [];

  const findSnippet = (targetValue: string): { snippet: string; page: number } => {
    for (const p of pages) {
      if (p.text.toLowerCase().includes(targetValue.toLowerCase())) {
        const pLines = p.text.split('\n');
        const matchLine = pLines.find((l) =>
          l.toLowerCase().includes(targetValue.toLowerCase())
        );
        return {
          snippet: (matchLine || targetValue).slice(0, 160).trim(),
          page: p.pageNumber,
        };
      }
    }
    return { snippet: targetValue.slice(0, 160), page: 1 };
  };

  // 1. Document Title / Type Detection
  const titlePatterns = [
    { regex: /certificate\s+of\s+incorporation/i, label: 'Certificate of Incorporation' },
    { regex: /permanent\s+account\s+number|pan\s+card/i, label: 'Permanent Account Number (PAN) Card' },
    { regex: /tax\s+invoice|taxpayer\s+identification/i, label: 'Tax Identification Document' },
    { regex: /goods\s+and\s+services\s+tax|gstin/i, label: 'GST Registration Certificate' },
    { regex: /republic\s+of\s+india\s+passport|passport/i, label: 'Indian Passport' },
    { regex: /driving\s+licence|driving\s+license/i, label: 'Driving Licence' },
    { regex: /unique\s+identification\s+authority|aadhaar/i, label: 'Aadhaar Identity Card' },
    { regex: /memorandum\s+of\s+association/i, label: 'Memorandum of Association' },
    { regex: /board\s+resolution/i, label: 'Board Resolution Document' },
    { regex: /utility\s+bill|electricity\s+bill/i, label: 'Utility / Address Proof Bill' },
  ];

  for (const { regex, label } of titlePatterns) {
    if (regex.test(fullText)) {
      const match = fullText.match(regex);
      const snippetInfo = findSnippet(match ? match[0] : label);
      fields.push({
        fieldName: 'document_title',
        fieldLabel: 'Document Title / Form Type',
        extractedValue: label,
        pageNumber: snippetInfo.page,
        evidenceSnippet: snippetInfo.snippet,
        extractionMethod: baseMethod,
        confidenceScore: overallConfidence ?? 0.94,
      });
      break;
    }
  }

  // 2. Registration / ID Numbers
  // GSTIN Pattern: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alpha/digit + 'Z' + 1 alpha/digit
  const gstinMatch = fullText.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
  if (gstinMatch) {
    const val = gstinMatch[1].toUpperCase();
    const info = findSnippet(val);
    fields.push({
      fieldName: 'registration_number',
      fieldLabel: 'GSTIN Registration ID',
      extractedValue: val,
      pageNumber: info.page,
      evidenceSnippet: info.snippet,
      extractionMethod: baseMethod,
      confidenceScore: 0.96,
    });
  } else {
    // PAN Pattern: 5 letters + 4 digits + 1 letter
    const panMatch = fullText.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/i);
    if (panMatch) {
      const val = panMatch[1].toUpperCase();
      const info = findSnippet(val);
      fields.push({
        fieldName: 'registration_number',
        fieldLabel: 'PAN / Tax Identification Number',
        extractedValue: val,
        pageNumber: info.page,
        evidenceSnippet: info.snippet,
        extractionMethod: baseMethod,
        confidenceScore: 0.95,
      });
    } else {
      // CIN Pattern (Corporate Identity Number)
      const cinMatch = fullText.match(/\b([LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b/i);
      if (cinMatch) {
        const val = cinMatch[1].toUpperCase();
        const info = findSnippet(val);
        fields.push({
          fieldName: 'registration_number',
          fieldLabel: 'Corporate Identification Number (CIN)',
          extractedValue: val,
          pageNumber: info.page,
          evidenceSnippet: info.snippet,
          extractionMethod: baseMethod,
          confidenceScore: 0.95,
        });
      } else {
        // Generic Registration Number lookup
        const genReg = fullText.match(/(?:registration|reg|licence|license|certificate)\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9/\-]{5,30})/i);
        if (genReg) {
          const val = genReg[1].trim();
          const info = findSnippet(val);
          fields.push({
            fieldName: 'registration_number',
            fieldLabel: 'Registration / Certificate Number',
            extractedValue: val,
            pageNumber: info.page,
            evidenceSnippet: info.snippet,
            extractionMethod: baseMethod,
            confidenceScore: overallConfidence ? Math.min(overallConfidence, 0.88) : 0.85,
          });
        }
      }
    }
  }

  // 3. Organisation / Applicant Name
  const orgPatterns = [
    /(?:name\s+of\s+(?:the\s+)?(?:company|entity|organisation|firm|institution)|company\s+name|legal\s+name|trade\s+name)\s*[:\-]\s*([A-Za-z0-9&.,\- ]{3,60})/i,
    /(?:M\/s|Messrs\.?)\s+([A-Za-z0-9&.,\- ]{3,60})/i,
    /(?:applicant\s+name|name\s+of\s+applicant|full\s+name)\s*[:\-]\s*([A-Za-z0-9.,\- ]{3,50})/i,
  ];

  let orgFound = false;
  for (const pat of orgPatterns) {
    const m = fullText.match(pat);
    if (m && m[1]) {
      const cleanVal = m[1].replace(/[\r\n]+/g, ' ').trim();
      if (cleanVal.length > 2 && !cleanVal.toLowerCase().includes('certificate')) {
        const info = findSnippet(cleanVal);
        fields.push({
          fieldName: 'organisation_name',
          fieldLabel: 'Organisation / Entity Name',
          extractedValue: cleanVal,
          pageNumber: info.page,
          evidenceSnippet: info.snippet,
          extractionMethod: baseMethod,
          confidenceScore: overallConfidence ? Math.min(overallConfidence, 0.91) : 0.88,
        });
        orgFound = true;
        break;
      }
    }
  }

  // Fallback: If PAN card detected, look for uppercase name line
  if (!orgFound && /permanent\s+account\s+number/i.test(fullText)) {
    const nameLineMatch = fullText.match(/(?:Name\s*[:\-]?\s*)([A-Z ]{3,40})/i);
    if (nameLineMatch && nameLineMatch[1]) {
      const val = nameLineMatch[1].trim();
      const info = findSnippet(val);
      fields.push({
        fieldName: 'applicant_name',
        fieldLabel: 'Applicant / Cardholder Name',
        extractedValue: val,
        pageNumber: info.page,
        evidenceSnippet: info.snippet,
        extractionMethod: baseMethod,
        confidenceScore: 0.90,
      });
      orgFound = true;
    }
  }

  // 4. Issue Date
  const issueDateMatch = fullText.match(
    /(?:date\s+of\s+issue|issued\s+on|date\s+of\s+incorporation|registration\s+date|issue\s+date|date)(?:\s+of\s+[a-z]+)?\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{4})/i
  );
  if (issueDateMatch && issueDateMatch[1]) {
    const val = issueDateMatch[1].trim();
    const info = findSnippet(val);
    fields.push({
      fieldName: 'issue_date',
      fieldLabel: 'Document Issue Date',
      extractedValue: val,
      pageNumber: info.page,
      evidenceSnippet: info.snippet,
      extractionMethod: baseMethod,
      confidenceScore: 0.92,
    });
  }

  // 5. Expiry Date / Validity
  const expiryDateMatch = fullText.match(
    /(?:valid\s+until|date\s+of\s+expiry|valid\s+thru|valid\s+to|expiry\s+date|expires\s+on)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+[0-9]{4})/i
  );
  if (expiryDateMatch && expiryDateMatch[1]) {
    const val = expiryDateMatch[1].trim();
    const info = findSnippet(val);
    fields.push({
      fieldName: 'expiry_date',
      fieldLabel: 'Document Expiry Date',
      extractedValue: val,
      pageNumber: info.page,
      evidenceSnippet: info.snippet,
      extractionMethod: baseMethod,
      confidenceScore: 0.90,
    });
  }

  // 6. Issuing Authority
  const authPatterns = [
    'Ministry of Corporate Affairs',
    'Government of India',
    'Income Tax Department',
    'Goods and Services Tax Network',
    'Registrar of Companies',
    'Unique Identification Authority of India',
    'Election Commission of India',
    'Transport Department',
    'State Government of',
    'Department of Revenue',
  ];

  for (const authName of authPatterns) {
    if (new RegExp(authName, 'i').test(fullText)) {
      const info = findSnippet(authName);
      fields.push({
        fieldName: 'issuing_authority',
        fieldLabel: 'Issuing Authority / Regulatory Body',
        extractedValue: authName,
        pageNumber: info.page,
        evidenceSnippet: info.snippet,
        extractionMethod: baseMethod,
        confidenceScore: 0.95,
      });
      break;
    }
  }

  // 7. Address / Registered Premises
  const addressMatch = fullText.match(
    /(?:registered\s+office|registered\s+address|principal\s+place\s+of\s+business|address)\s*[:\-]?\s*([A-Za-z0-9,.\-/# ]{10,120})/i
  );
  if (addressMatch && addressMatch[1]) {
    const rawAddr = addressMatch[1].replace(/[\r\n]+/g, ' ').trim();
    const info = findSnippet(rawAddr);
    fields.push({
      fieldName: 'address',
      fieldLabel: 'Registered Address / Domicile',
      extractedValue: rawAddr,
      pageNumber: info.page,
      evidenceSnippet: info.snippet,
      extractionMethod: baseMethod,
      confidenceScore: 0.86,
    });
  }

  return fields;
}

/**
 * Heuristic Document Classifier
 */
export function classifyDocumentText(fullText: string): {
  type: DocumentCategory;
  confidence: number;
  reason: string;
} {
  const text = fullText.toLowerCase();

  if (text.includes('incorporation') || text.includes('registrar of companies') || text.includes('corporate identity number') || text.includes('cin:')) {
    return {
      type: 'registration_certificate',
      confidence: 0.96,
      reason: 'Detected incorporation headers, statutory authority and corporate registration identifiers.',
    };
  }

  if (text.includes('gstin') || text.includes('goods and services tax') || text.includes('registration certificate')) {
    return {
      type: 'registration_certificate',
      confidence: 0.94,
      reason: 'Contains GST registration certificate terms and statutory tax credentials.',
    };
  }

  if (text.includes('permanent account number') || text.includes('income tax department') || text.includes('pan card') || text.includes('father\'s name')) {
    return {
      type: 'identity_document',
      confidence: 0.95,
      reason: 'Matches Indian Permanent Account Number (PAN) identity format and revenue markers.',
    };
  }

  if (text.includes('passport') || text.includes('republic of india') || text.includes('driving licence') || text.includes('aadhaar')) {
    return {
      type: 'identity_document',
      confidence: 0.92,
      reason: 'Identified standard government biometric identity credential patterns.',
    };
  }

  if (text.includes('electricity') || text.includes('utility bill') || text.includes('consumer number') || text.includes('water bill') || text.includes('rent agreement')) {
    return {
      type: 'address_proof',
      confidence: 0.89,
      reason: 'Matches domestic utility billing patterns and service connection address records.',
    };
  }

  if (text.includes('balance sheet') || text.includes('profit and loss') || text.includes('financial statements') || text.includes('audit report') || text.includes('tax invoice')) {
    return {
      type: 'tax_financial_document',
      confidence: 0.91,
      reason: 'Matches commercial accounting, tax declaration, or statutory financial statements.',
    };
  }

  if (text.includes('application form') || text.includes('declaration') || text.includes('signature of applicant')) {
    return {
      type: 'application_form',
      confidence: 0.85,
      reason: 'Identified formal applicant submission structure and declaration lines.',
    };
  }

  return {
    type: 'supporting_evidence',
    confidence: 0.65,
    reason: 'Document contains general institutional textual evidence without distinct statutory signatures.',
  };
}

/**
 * Perform genuine OCR on an image Blob using Tesseract.js WASM
 */
export async function performImageOcr(
  imageSource: Blob | string,
  onProgress?: (progress: number, status: string) => void
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('eng', 1, {
    logger: (m: any) => {
      if (onProgress && m) {
        onProgress(m.progress ?? 0, m.status ?? 'Processing image');
      }
    },
  });

  try {
    const ret = await worker.recognize(imageSource);
    const text = ret.data.text || '';
    const confidence = ret.data.confidence ? ret.data.confidence / 100 : 0.80;
    return { text, confidence };
  } finally {
    await worker.terminate();
  }
}

/**
 * Render PDF page to HTML canvas and run OCR
 */
async function ocrPdfPage(
  page: any,
  pageNumber: number
): Promise<{ text: string; confidence: number }> {
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error(`Failed to create 2D canvas context for page ${pageNumber}`);
  }

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error(`Failed to convert PDF canvas to image blob for page ${pageNumber}`));
        return;
      }
      try {
        const ocrRes = await performImageOcr(blob);
        resolve(ocrRes);
      } catch (e) {
        reject(e);
      }
    }, 'image/png');
  });
}

/**
 * Extract text from PDF document using embedded text with OCR fallback for scanned pages
 */
export async function extractFromPdf(
  arrayBuffer: ArrayBuffer,
  onProgress?: (msg: string) => void
): Promise<{
  fullText: string;
  pages: ExtractedPageContent[];
  method: ExtractionMethod;
  overallConfidence: number | null;
}> {
  onProgress?.('Loading PDF structure...');
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, MAX_PDF_PAGES_TO_PROCESS);

  const pages: ExtractedPageContent[] = [];
  let totalChars = 0;
  let ocrUsed = false;
  let digitalUsed = false;
  let ocrConfidenceSum = 0;
  let ocrPageCount = 0;

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(`Extracting page ${i} of ${numPages}...`);
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const extractedStr = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    // Check if the page has sufficient digital text or is scanned
    if (extractedStr.length >= 25) {
      digitalUsed = true;
      totalChars += extractedStr.length;
      pages.push({
        pageNumber: i,
        text: extractedStr,
        method: 'pdf_text',
        confidence: 0.98,
      });
    } else {
      // Scanned or rasterized page -> run OCR fallback
      onProgress?.(`Page ${i} appears scanned. Initialising OCR engine...`);
      ocrUsed = true;
      const ocrResult = await ocrPdfPage(page, i);
      ocrConfidenceSum += ocrResult.confidence;
      ocrPageCount += 1;
      totalChars += ocrResult.text.length;
      pages.push({
        pageNumber: i,
        text: ocrResult.text,
        method: 'ocr',
        confidence: ocrResult.confidence,
      });
    }
  }

  const fullText = pages.map((p) => p.text).join('\n\n');
  const method: ExtractionMethod =
    ocrUsed && digitalUsed ? 'hybrid' : ocrUsed ? 'ocr' : 'pdf_text';

  const overallConfidence = ocrPageCount > 0 ? ocrConfidenceSum / ocrPageCount : 0.96;

  return { fullText, pages, method, overallConfidence };
}

/**
 * Execute Full Document Extraction Pipeline
 *
 * 1. Downloads private document from Supabase Storage
 * 2. Determines file type (PDF vs Image)
 * 3. Extracts text via PDF text extraction or Tesseract OCR
 * 4. Parses structured candidate fields
 * 5. Runs heuristic document classification
 * 6. Records extraction results and candidate fields in Supabase database
 */
export async function executeDocumentExtraction(
  doc: ApplicationDocument,
  userId: string,
  onProgress?: (status: string) => void
): Promise<{
  extraction: DocumentExtractionRecord | null;
  fields: ExtractedFieldRecord[];
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      extraction: null,
      fields: [],
      error: new Error('Supabase credentials are not configured.'),
    };
  }

  try {
    // 1. Mark document and create extraction row in 'processing' state
    onProgress?.('Accessing encrypted document vault...');
    await supabase
      .from('application_documents')
      .update({ processing_status: 'processing' })
      .eq('id', doc.id);

    // 2. Securely download file from private Supabase Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(doc.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download document from storage: ${downloadError?.message}`);
    }

    onProgress?.('Document downloaded. Initialising intelligence pipeline...');

    let fullText = '';
    let pages: ExtractedPageContent[] = [];
    let extractionMethod: ExtractionMethod = 'pdf_text';
    let overallConfidence: number | null = null;
    let pageCount = 1;

    // 3. Process PDF vs Image
    if (doc.mime_type === 'application/pdf') {
      const buffer = await fileBlob.arrayBuffer();
      const pdfResult = await extractFromPdf(buffer, onProgress);
      fullText = pdfResult.fullText;
      pages = pdfResult.pages;
      extractionMethod = pdfResult.method;
      overallConfidence = pdfResult.overallConfidence;
      pageCount = pages.length;
    } else {
      // JPEG or PNG Image
      onProgress?.('Running OCR analysis on image document...');
      extractionMethod = 'ocr';
      const ocrResult = await performImageOcr(fileBlob, (prog, st) => {
        onProgress?.(`OCR Progress: ${Math.round(prog * 100)}% (${st})`);
      });
      fullText = ocrResult.text;
      overallConfidence = ocrResult.confidence;
      pageCount = 1;
      pages = [
        {
          pageNumber: 1,
          text: fullText,
          method: 'ocr',
          confidence: overallConfidence,
        },
      ];
    }

    onProgress?.('Parsing structured fields and heuristic classification...');

    // 4. Candidate Field Extraction
    const candidateFields = parseStructuredFields(
      fullText,
      pages,
      extractionMethod,
      overallConfidence
    );

    // 5. Classification
    const classification = classifyDocumentText(fullText);

    onProgress?.('Persisting extracted fields to database...');

    // 6. Insert or Update document_extractions record
    const { data: extractionRecord, error: extError } = await supabase
      .from('document_extractions')
      .upsert(
        {
          document_id: doc.id,
          application_id: doc.application_id,
          user_id: userId,
          extraction_status: 'completed',
          extraction_method: extractionMethod,
          raw_text: fullText,
          page_count: pageCount,
          classified_type: classification.type,
          classification_confidence: classification.confidence,
          classification_reason: classification.reason,
          error_message: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'document_id' }
      )
      .select()
      .single();

    if (extError || !extractionRecord) {
      throw new Error(`Failed to save extraction record: ${extError?.message}`);
    }

    // 7. Insert Extracted Fields
    // Remove previous extracted fields for this document to avoid duplicates on re-extraction
    await supabase.from('extracted_fields').delete().eq('document_id', doc.id);

    const fieldsToInsert = candidateFields.map((f) => ({
      extraction_id: extractionRecord.id,
      document_id: doc.id,
      application_id: doc.application_id,
      user_id: userId,
      field_name: f.fieldName,
      field_label: f.fieldLabel,
      extracted_value: f.extractedValue,
      reviewed_value: f.extractedValue,
      page_number: f.pageNumber,
      evidence_snippet: f.evidenceSnippet,
      extraction_method: f.extractionMethod,
      confidence_score: f.confidenceScore,
      review_status: 'needs_review' as FieldReviewStatus,
    }));

    let savedFields: ExtractedFieldRecord[] = [];
    if (fieldsToInsert.length > 0) {
      const { data: insertedFields, error: fieldError } = await supabase
        .from('extracted_fields')
        .insert(fieldsToInsert)
        .select();

      if (fieldError) {
        console.warn('[TypeNull] Extracted fields insert warning:', fieldError.message);
      } else {
        savedFields = (insertedFields as ExtractedFieldRecord[]) || [];
      }
    }

    // 8. Update Application Document processing_status to 'completed'
    await supabase
      .from('application_documents')
      .update({ processing_status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', doc.id);

    return {
      extraction: extractionRecord as DocumentExtractionRecord,
      fields: savedFields,
      error: null,
    };
  } catch (err: any) {
    console.error('[TypeNull] Document extraction error:', err);
    // Mark document as failed
    await supabase
      .from('application_documents')
      .update({ processing_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', doc.id);

    await supabase.from('document_extractions').upsert({
      document_id: doc.id,
      application_id: doc.application_id,
      user_id: userId,
      extraction_status: 'failed',
      extraction_method: 'pdf_text',
      error_message: err.message || 'Unknown processing error',
      updated_at: new Date().toISOString(),
    });

    return {
      extraction: null,
      fields: [],
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch extraction details and structured fields for a document
 */
export async function fetchDocumentExtraction(docId: string): Promise<{
  extraction: DocumentExtractionRecord | null;
  fields: ExtractedFieldRecord[];
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { extraction: null, fields: [], error: new Error('Supabase not configured.') };
  }

  try {
    const { data: extData, error: extError } = await supabase
      .from('document_extractions')
      .select('*')
      .eq('document_id', docId)
      .maybeSingle();

    if (extError) {
      return { extraction: null, fields: [], error: new Error(extError.message) };
    }

    const { data: fieldsData, error: fieldsError } = await supabase
      .from('extracted_fields')
      .select('*')
      .eq('document_id', docId)
      .order('page_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (fieldsError) {
      return {
        extraction: extData as DocumentExtractionRecord | null,
        fields: [],
        error: new Error(fieldsError.message),
      };
    }

    return {
      extraction: extData as DocumentExtractionRecord | null,
      fields: (fieldsData as ExtractedFieldRecord[]) || [],
      error: null,
    };
  } catch (err) {
    return { extraction: null, fields: [], error: err as Error };
  }
}

/**
 * Update human review for an extracted field
 */
export async function updateExtractedFieldReview(
  fieldId: string,
  reviewedValue: string,
  reviewStatus: FieldReviewStatus
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase not configured.') };
  }

  try {
    const { error } = await supabase
      .from('extracted_fields')
      .update({
        reviewed_value: reviewedValue,
        review_status: reviewStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fieldId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/**
 * Batch confirm all fields for an extraction
 */
export async function batchConfirmFields(
  fieldIds: string[]
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured || !supabase || fieldIds.length === 0) {
    return { error: null };
  }

  try {
    const { error } = await supabase
      .from('extracted_fields')
      .update({
        review_status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .in('id', fieldIds);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}
