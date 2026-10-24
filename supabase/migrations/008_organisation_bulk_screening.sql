-- ==============================================================================
-- TypeNull Database Schema Migration: 008_organisation_bulk_screening.sql
-- Module 2: Organisation Bulk Screening Enhancements & Tenancy Protection
-- ==============================================================================

-- 1. Extend screening_batches with catalogue references and updated timestamps
ALTER TABLE public.screening_batches
    ADD COLUMN IF NOT EXISTS service_code TEXT,
    ADD COLUMN IF NOT EXISTS variant_code TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

COMMENT ON COLUMN public.screening_batches.service_code IS 'Official government service code (e.g. MCA-SRV-SPICE-PLUS).';
COMMENT ON COLUMN public.screening_batches.variant_code IS 'Statutory application variant code (e.g. MCA-SPICE-INC32).';

-- 2. Extend screening_batch_items with item-level status, error tracking, and variant references
ALTER TABLE public.screening_batch_items
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS service_code TEXT,
    ADD COLUMN IF NOT EXISTS variant_code TEXT;

COMMENT ON COLUMN public.screening_batch_items.status IS 'Processing status of individual applicant dossier in batch.';
COMMENT ON COLUMN public.screening_batch_items.error_message IS 'Recorded failure explanation if extraction or assessment could not complete.';

-- 3. Additional Indexes for Organisation Isolation and Batch Progress Lookups
CREATE INDEX IF NOT EXISTS idx_screening_batches_status ON public.screening_batches(status);
CREATE INDEX IF NOT EXISTS idx_screening_batches_variant ON public.screening_batches(variant_code);
CREATE INDEX IF NOT EXISTS idx_screening_batch_items_status ON public.screening_batch_items(status);

-- 4. Verify and Harden RLS Policies for Multi-Tenant Organisation Isolation

-- Ensure officers can only insert batches with their authenticated organisation ID or personal user ID
DROP POLICY IF EXISTS "screening_batches_insert_officer" ON public.screening_batches;
CREATE POLICY "screening_batches_insert_officer"
    ON public.screening_batches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND (
            organisation_id IS NULL OR EXISTS (
                SELECT 1 FROM public.organisation_members om
                WHERE om.organisation_id = public.screening_batches.organisation_id
                  AND om.user_id = auth.uid()
            )
        )
    );

-- Ensure officers can update/retry batches only within their own authorised organisation
DROP POLICY IF EXISTS "screening_batches_update_officer" ON public.screening_batches;
CREATE POLICY "screening_batches_update_officer"
    ON public.screening_batches
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR (
            organisation_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.organisation_members om
                WHERE om.organisation_id = public.screening_batches.organisation_id
                  AND om.user_id = auth.uid()
            )
        )
    );
