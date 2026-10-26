-- ==============================================================================
-- TypeNull Database Schema Migration: 013_aicte_rulebook_and_regulatory_traceability_rollback.sql
-- Rollback for Migration 013
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS public.aicte_institution_compliance_records CASCADE;
DROP TABLE IF EXISTS public.aicte_regulatory_rules CASCADE;
DROP TABLE IF EXISTS public.aicte_regulatory_sources CASCADE;

COMMIT;
