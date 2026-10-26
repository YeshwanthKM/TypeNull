-- ==============================================================================
-- TypeNull Database Schema Migration: 012_purge_obsolete_prototype_data.sql
-- Purge Obsolete Generic Prototype Data & Archive Legacy Service Catalogues
-- ==============================================================================
--
-- PURPOSE:
-- 1. Safely archives legacy corporate, tax, and passport service catalogue entries
--    (MCA, CBIC, MEA, UIDAI, CGPDTM) without dropping table structures.
-- 2. Registers AICTE Extension of Approval (EoA) as the SOLE active application service.
-- 3. Deletes confirmed mock organisations (e.g. MCA-ROC, CBDT, UIDAI, MEA, DPIIT, Acme Corp, Demo Org)
--    and their memberships, preserving table definitions.
-- 4. Purges obsolete prototype applications and cascading dependencies (documents, extractions,
--    extracted fields, validation runs, authenticity assessments).
-- 5. Purges obsolete organisation access requests and legacy screening batches.
-- 6. Preserves AICTE Officer accounts (with is_admin = true), valid institution profiles,
--    institution verification audit trails, two-role model, and RLS policies.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Archive Obsolete Generic Government Services & Application Types
-- -----------------------------------------------------------------------------

-- Extend status checks to explicitly support 'archived'
ALTER TABLE public.government_services 
    DROP CONSTRAINT IF EXISTS government_services_status_check;
ALTER TABLE public.government_services 
    ADD CONSTRAINT government_services_status_check 
    CHECK (status IN ('active', 'inactive', 'deprecated', 'archived'));

ALTER TABLE public.service_application_types 
    DROP CONSTRAINT IF EXISTS service_application_types_lifecycle_status_check;
ALTER TABLE public.service_application_types 
    ADD CONSTRAINT service_application_types_lifecycle_status_check 
    CHECK (lifecycle_status IN ('discovered', 'downloaded', 'extracted', 'needs_verification', 'verified', 'published', 'superseded', 'archived'));

-- Archive generic corporate, tax, passport, and unrelated service catalogue entries
UPDATE public.government_services
SET status = 'archived',
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
SET lifecycle_status = 'archived',
    updated_at = timezone('utc'::text, now())
WHERE variant_code IN (
    'MCA-SPICE-INC32',
    'CBIC-GST-REG06',
    'MEA-PASS-P01'
);

-- Ensure AICTE Government Source exists
INSERT INTO public.government_sources (
    id, authority, source_url, source_type, jurisdiction, 
    supported_categories, retrieval_status, verification_status, access_limitations,
    last_discovered_at, last_checked_at, created_at
) VALUES (
    'SRC-AICTE-GOV',
    'All India Council for Technical Education (AICTE), Ministry of Education',
    'https://www.aicte-india.org/',
    'portal',
    'India (Technical Education & Apex Regulatory)',
    '["institution_registration", "regulatory_application"]'::jsonb,
    'active',
    'verified',
    'Apex statutory authority for technical education approval processes and Extension of Approval (EoA).',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (id) DO UPDATE SET
    authority = EXCLUDED.authority,
    source_url = EXCLUDED.source_url,
    last_checked_at = timezone('utc'::text, now());

-- Ensure AICTE Extension of Approval (EoA) is registered as the SOLE active service
INSERT INTO public.government_services (
    id, source_id, service_name, service_code, department,
    jurisdiction, official_url, description, category, status, created_at, updated_at
) VALUES (
    'a1c7e000-0000-0000-0000-000000000001',
    'SRC-AICTE-GOV',
    'Extension of Approval (EoA) for Technical Institutions',
    'AICTE-EOA-2026',
    'All India Council for Technical Education (AICTE)',
    'India (National)',
    'https://www.aicte-india.org/bureaus/approval',
    'Statutory annual Extension of Approval for existing approved technical institutions.',
    'institution_registration',
    'active',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (service_code) DO UPDATE SET
    status = 'active',
    category = 'institution_registration',
    updated_at = timezone('utc'::text, now());

INSERT INTO public.service_application_types (
    id, service_id, application_name, variant_code, applicant_category,
    requirements_version, lifecycle_status, published_at, verified_by, verified_at,
    admin_notes, created_at, updated_at
) VALUES (
    'a1c7e000-0000-0000-0000-000000000002',
    'a1c7e000-0000-0000-0000-000000000001',
    'Extension of Approval (EoA) Application',
    'AICTE-EOA-2026',
    'approved_technical_institution',
    '2026-27',
    'published',
    timezone('utc'::text, now()),
    'AICTE Approval Scrutiny Bureau',
    timezone('utc'::text, now()),
    'Verified against AICTE Approval Process Handbook (APH) regulations for Extension of Approval.',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (service_id, variant_code, requirements_version) DO UPDATE SET
    lifecycle_status = 'published',
    updated_at = timezone('utc'::text, now());

-- -----------------------------------------------------------------------------
-- 2. Purge Obsolete Organisation Access Requests
-- -----------------------------------------------------------------------------
DELETE FROM public.organisation_access_requests;

-- -----------------------------------------------------------------------------
-- 3. Purge Confirmed Mock Organisations & Memberships
-- -----------------------------------------------------------------------------
-- Delete memberships associated with mock organisations
DELETE FROM public.organisation_members
WHERE organisation_id IN (
    SELECT id FROM public.organisations
    WHERE code IN ('MCA-ROC', 'CBDT', 'UIDAI', 'MEA', 'DPIIT')
       OR name ILIKE 'Acme%'
       OR name ILIKE 'Demo Org%'
);

-- Delete confirmed mock organisations (Preserves table structure)
DELETE FROM public.organisations
WHERE code IN ('MCA-ROC', 'CBDT', 'UIDAI', 'MEA', 'DPIIT')
   OR name ILIKE 'Acme%'
   OR name ILIKE 'Demo Org%';

-- -----------------------------------------------------------------------------
-- 4. Purge Obsolete Screening Batches & Items
-- -----------------------------------------------------------------------------
DELETE FROM public.screening_batch_items;
DELETE FROM public.screening_batches;

-- -----------------------------------------------------------------------------
-- 5. Purge Obsolete Prototype Applications & Cascaded Documents
-- -----------------------------------------------------------------------------
-- Any application that is NOT an institution EoA application or does not belong to a retained institution profile
DELETE FROM public.applications
WHERE category != 'institution_registration'
   OR (title NOT ILIKE '%EoA%' AND title NOT ILIKE '%Extension of Approval%')
   OR user_id NOT IN (
       SELECT id FROM public.profiles 
       WHERE role IN ('institution', 'officer')
   );

-- -----------------------------------------------------------------------------
-- 6. Storage File Purge (Cleans orphaned files in 'application-documents' bucket)
-- -----------------------------------------------------------------------------
DELETE FROM storage.objects
WHERE bucket_id = 'application-documents'
  AND name NOT IN (
      SELECT storage_path FROM public.application_documents
  );

COMMIT;
