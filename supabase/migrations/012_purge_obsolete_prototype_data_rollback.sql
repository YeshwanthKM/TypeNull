-- ==============================================================================
-- TypeNull Database Schema Migration: 012_purge_obsolete_prototype_data_rollback.sql
-- Rollback for Migration 012
-- ==============================================================================

BEGIN;

-- 1. Revert archived services back to active/published status
UPDATE public.government_services
SET status = 'active',
    updated_at = timezone('utc'::text, now())
WHERE service_code IN (
    'MCA-SRV-SPICE-PLUS',
    'CBIC-SRV-GST-REG',
    'MEA-SRV-PASS-FORM1',
    'MCA-SRV-DIR3',
    'UIDAI-SRV-UPDATE',
    'CGPDTM-SRV-TMA'
);

UPDATE public.service_application_types
SET lifecycle_status = 'published',
    updated_at = timezone('utc'::text, now())
WHERE variant_code IN (
    'MCA-SPICE-INC32',
    'CBIC-GST-REG06',
    'MEA-PASS-P01'
);

-- 2. Restore default mock organisations if needed for offline regression testing
INSERT INTO public.organisations (id, name, code, category, description, created_at, updated_at)
VALUES 
    ('org-mca-roc', 'Ministry of Corporate Affairs - ROC', 'MCA-ROC', 'regulatory_body', 'Statutory authority evaluating incorporation, SPICe+ dossiers, and company governance.', timezone('utc'::text, now()), timezone('utc'::text, now())),
    ('org-cbdt-dir', 'Central Board of Indirect Taxes and Customs - CBDT', 'CBDT', 'regulatory_body', 'Evaluates indirect tax compliance, GST filings, and customs duties.', timezone('utc'::text, now()), timezone('utc'::text, now())),
    ('org-uidai', 'Unique Identification Authority of India (UIDAI)', 'UIDAI', 'regulatory_body', 'Issues Aadhaar numbers and manages demographic identity verification.', timezone('utc'::text, now()), timezone('utc'::text, now())),
    ('org-mea', 'Ministry of External Affairs (MEA)', 'MEA', 'regulatory_body', 'Handles passport issuance and international travel documentation.', timezone('utc'::text, now()), timezone('utc'::text, now())),
    ('org-dpiit', 'Department for Promotion of Industry and Internal Trade (DPIIT)', 'DPIIT', 'regulatory_body', 'Oversees company registration, industry promotion, and startup policy.', timezone('utc'::text, now()), timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

COMMIT;
