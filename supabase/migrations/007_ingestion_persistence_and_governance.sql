-- ==============================================================================
-- TypeNull Database Schema Migration: 007_ingestion_persistence_and_governance.sql
-- Ingestion Persistence Hardening and Requirement Governance Metadata
-- ==============================================================================

-- 1. Extend service_application_types with administrative review & governance tracking
ALTER TABLE public.service_application_types
    ADD COLUMN IF NOT EXISTS verified_by TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN public.service_application_types.verified_by IS 'Identifier or committee designation responsible for reviewing extracted statutory requirements.';
COMMENT ON COLUMN public.service_application_types.verified_at IS 'Timestamp when the requirement set was verified by an authorized officer or administrator.';
COMMENT ON COLUMN public.service_application_types.admin_notes IS 'Audit notes, statutory gazette citations, or rationale recorded during review.';

-- 2. Add performance indexes for governance filtering
CREATE INDEX IF NOT EXISTS idx_service_app_types_verified_at 
    ON public.service_application_types(verified_at);

CREATE INDEX IF NOT EXISTS idx_service_app_types_published_at 
    ON public.service_application_types(published_at);

-- 3. Extend ingestion_runs tracking with runtime execution mode
ALTER TABLE public.ingestion_runs
    ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.ingestion_runs.is_simulated IS 'Flags whether the run was an in-memory/simulated execution when database persistence is bypassed or unconfigured.';
COMMENT ON COLUMN public.ingestion_runs.completed_at IS 'Timestamp when the discovery and ingestion pipeline concluded.';

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status 
    ON public.ingestion_runs(status);
