-- ==============================================================================
-- TypeNull Database Schema Migration: 002_document_storage.sql
-- Phase 3: Secure Document Ingestion, Storage Bucket & Document Metadata
-- ==============================================================================

-- 1. Create Document Metadata Table
CREATE TABLE IF NOT EXISTS public.application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    document_type TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'extracted', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.application_documents IS 'Metadata for document uploads linked to specific verification applications.';

-- 2. Indexes for Fast Lookups & Foreign Key Joins
CREATE INDEX IF NOT EXISTS idx_application_documents_app_id ON public.application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_user_id ON public.application_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_status ON public.application_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_application_documents_created_at ON public.application_documents(created_at DESC);

-- 3. Automatic Timestamp Trigger
DROP TRIGGER IF EXISTS set_application_documents_updated_at ON public.application_documents;
CREATE TRIGGER set_application_documents_updated_at
    BEFORE UPDATE ON public.application_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row-Level Security on application_documents
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for application_documents
-- Users can only read, create, update, or delete document records belonging to their own applications.
DROP POLICY IF EXISTS "application_documents_select_own" ON public.application_documents;
CREATE POLICY "application_documents_select_own"
    ON public.application_documents
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "application_documents_insert_own" ON public.application_documents;
CREATE POLICY "application_documents_insert_own"
    ON public.application_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "application_documents_update_own" ON public.application_documents;
CREATE POLICY "application_documents_update_own"
    ON public.application_documents
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "application_documents_delete_own" ON public.application_documents;
CREATE POLICY "application_documents_delete_own"
    ON public.application_documents
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. Supabase Storage: Create Private 'application-documents' Bucket
-- Storage path structure: {user_id}/{application_id}/{unique_file_id}.{ext}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    false,
    10485760, -- 10 MB in bytes
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- 7. Storage Access Policies on storage.objects
-- Storage path layout: {user_id}/{application_id}/{filename}
-- Users may only view, upload, update, and delete files inside their own user_id directory prefix.
DROP POLICY IF EXISTS "Users can read own application documents" ON storage.objects;
CREATE POLICY "Users can read own application documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can upload own application documents" ON storage.objects;
CREATE POLICY "Users can upload own application documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own application documents" ON storage.objects;
CREATE POLICY "Users can update own application documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own application documents" ON storage.objects;
CREATE POLICY "Users can delete own application documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'application-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
