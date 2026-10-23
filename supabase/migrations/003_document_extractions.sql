-- ==============================================================================
-- TypeNull Database Schema Migration: 003_document_extractions.sql
-- Phase 4: Document Text Extraction, Structured Field Parsing & Human Review
-- ==============================================================================

-- 1. Relax or Update processing_status on public.application_documents
-- Allows statuses: 'uploaded', 'queued', 'processing', 'completed', 'extracted', 'failed'
ALTER TABLE public.application_documents
    DROP CONSTRAINT IF EXISTS application_documents_processing_status_check;

ALTER TABLE public.application_documents
    ADD CONSTRAINT application_documents_processing_status_check
    CHECK (processing_status IN ('uploaded', 'queued', 'processing', 'completed', 'extracted', 'failed'));

-- 2. Create document_extractions Table
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.application_documents(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    extraction_status TEXT NOT NULL DEFAULT 'queued' CHECK (extraction_status IN ('queued', 'processing', 'completed', 'failed')),
    extraction_method TEXT NOT NULL DEFAULT 'pdf_text' CHECK (extraction_method IN ('pdf_text', 'ocr', 'hybrid', 'manual')),
    raw_text TEXT,
    page_count INTEGER NOT NULL DEFAULT 1,
    classified_type TEXT,
    classification_confidence NUMERIC(4, 3),
    classification_reason TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.document_extractions IS 'Stores raw text extraction, heuristic document classification, and pipeline status for an application document.';

-- 3. Create extracted_fields Table
CREATE TABLE IF NOT EXISTS public.extracted_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES public.document_extractions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.application_documents(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    extracted_value TEXT,
    reviewed_value TEXT,
    page_number INTEGER DEFAULT 1,
    evidence_snippet TEXT,
    extraction_method TEXT DEFAULT 'pdf_text',
    confidence_score NUMERIC(4, 3),
    review_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (review_status IN ('needs_review', 'confirmed', 'corrected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.extracted_fields IS 'Normalized candidate fields extracted from documents with provenance snippet and human review state.';

-- 4. Fast Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_document_extractions_doc_id ON public.document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_app_id ON public.document_extractions(application_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_user_id ON public.document_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_extractions_status ON public.document_extractions(extraction_status);

CREATE INDEX IF NOT EXISTS idx_extracted_fields_extraction_id ON public.extracted_fields(extraction_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_doc_id ON public.extracted_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_app_id ON public.extracted_fields(application_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_user_id ON public.extracted_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_field_name ON public.extracted_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_review_status ON public.extracted_fields(review_status);

-- 5. Updated At Triggers
DROP TRIGGER IF EXISTS set_document_extractions_updated_at ON public.document_extractions;
CREATE TRIGGER set_document_extractions_updated_at
    BEFORE UPDATE ON public.document_extractions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_extracted_fields_updated_at ON public.extracted_fields;
CREATE TRIGGER set_extracted_fields_updated_at
    BEFORE UPDATE ON public.extracted_fields
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enable Row-Level Security
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: document_extractions
DROP POLICY IF EXISTS "document_extractions_select_own" ON public.document_extractions;
CREATE POLICY "document_extractions_select_own"
    ON public.document_extractions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "document_extractions_insert_own" ON public.document_extractions;
CREATE POLICY "document_extractions_insert_own"
    ON public.document_extractions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "document_extractions_update_own" ON public.document_extractions;
CREATE POLICY "document_extractions_update_own"
    ON public.document_extractions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "document_extractions_delete_own" ON public.document_extractions;
CREATE POLICY "document_extractions_delete_own"
    ON public.document_extractions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 8. RLS Policies: extracted_fields
DROP POLICY IF EXISTS "extracted_fields_select_own" ON public.extracted_fields;
CREATE POLICY "extracted_fields_select_own"
    ON public.extracted_fields
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "extracted_fields_insert_own" ON public.extracted_fields;
CREATE POLICY "extracted_fields_insert_own"
    ON public.extracted_fields
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "extracted_fields_update_own" ON public.extracted_fields;
CREATE POLICY "extracted_fields_update_own"
    ON public.extracted_fields
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "extracted_fields_delete_own" ON public.extracted_fields;
CREATE POLICY "extracted_fields_delete_own"
    ON public.extracted_fields
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
