-- ==============================================================================
-- TypeNull Database Schema Migration: 005_validation_and_screening.sql
-- Validation Runs, Organisation Screening Batches & Screening Items
-- ==============================================================================

-- 1. Create validation_runs Table (Applicant Pre-Validation & Dossier Checks)
CREATE TABLE IF NOT EXISTS public.validation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('Complete', 'Minor Issues', 'Major Issues', 'Unable to Assess')),
    counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.validation_runs IS 'Historical pre-validation runs and statutory rule findings for applicant dossiers.';

CREATE INDEX IF NOT EXISTS idx_validation_runs_app_id ON public.validation_runs(application_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_user_id ON public.validation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_created_at ON public.validation_runs(created_at DESC);

-- Enable RLS
ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;

-- Applicants can view their own validation runs
DROP POLICY IF EXISTS "validation_runs_select_own" ON public.validation_runs;
CREATE POLICY "validation_runs_select_own"
    ON public.validation_runs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Applicants can create validation runs for their own applications
DROP POLICY IF EXISTS "validation_runs_insert_own" ON public.validation_runs;
CREATE POLICY "validation_runs_insert_own"
    ON public.validation_runs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);


-- 2. Create screening_batches Table (Organisation Bulk Screening Intake)
CREATE TABLE IF NOT EXISTS public.screening_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_category TEXT NOT NULL,
    total_applications INTEGER NOT NULL DEFAULT 0,
    outcome_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.screening_batches IS 'Organisation bulk screening runs across received application dossiers.';

CREATE INDEX IF NOT EXISTS idx_screening_batches_org_id ON public.screening_batches(organisation_id);
CREATE INDEX IF NOT EXISTS idx_screening_batches_user_id ON public.screening_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_batches_created_at ON public.screening_batches(created_at DESC);

ALTER TABLE public.screening_batches ENABLE ROW LEVEL SECURITY;

-- Officers can view batches belonging to an organisation they are a member of, or created by themselves
DROP POLICY IF EXISTS "screening_batches_select_officer" ON public.screening_batches;
CREATE POLICY "screening_batches_select_officer"
    ON public.screening_batches
    FOR SELECT
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

-- Officers can insert batches for their authorised organisations
DROP POLICY IF EXISTS "screening_batches_insert_officer" ON public.screening_batches;
CREATE POLICY "screening_batches_insert_officer"
    ON public.screening_batches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );


-- 3. Create screening_batch_items Table (Individual applicant dossiers in a batch)
CREATE TABLE IF NOT EXISTS public.screening_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.screening_batches(id) ON DELETE CASCADE,
    applicant_identifier TEXT NOT NULL,
    target_category TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('Complete', 'Minor Issues', 'Major Issues', 'Unable to Assess')),
    document_count INTEGER NOT NULL DEFAULT 0,
    counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.screening_batch_items IS 'Itemized screening outcome and findings for each applicant in a bulk screening batch.';

CREATE INDEX IF NOT EXISTS idx_screening_batch_items_batch_id ON public.screening_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_screening_batch_items_outcome ON public.screening_batch_items(outcome);

ALTER TABLE public.screening_batch_items ENABLE ROW LEVEL SECURITY;

-- Officers can view batch items linked to a batch they can view
DROP POLICY IF EXISTS "screening_batch_items_select" ON public.screening_batch_items;
CREATE POLICY "screening_batch_items_select"
    ON public.screening_batch_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.screening_batches sb
            WHERE sb.id = public.screening_batch_items.batch_id
              AND (
                  sb.user_id = auth.uid()
                  OR (
                      sb.organisation_id IS NOT NULL AND EXISTS (
                          SELECT 1 FROM public.organisation_members om
                          WHERE om.organisation_id = sb.organisation_id
                            AND om.user_id = auth.uid()
                      )
                  )
              )
        )
    );

DROP POLICY IF EXISTS "screening_batch_items_insert" ON public.screening_batch_items;
CREATE POLICY "screening_batch_items_insert"
    ON public.screening_batch_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.screening_batches sb
            WHERE sb.id = public.screening_batch_items.batch_id
              AND sb.user_id = auth.uid()
        )
    );
