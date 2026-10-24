-- ==============================================================================
-- TypeNull Database Schema Migration: 006_government_services_and_ingestion.sql
-- Automated Government Form Discovery, Extraction and Knowledge Base Ingestion
-- ==============================================================================

-- 1. Official Government Sources Registry
CREATE TABLE IF NOT EXISTS public.government_sources (
    id TEXT PRIMARY KEY,
    authority TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL CHECK (source_type IN ('portal', 'directory', 'department_site', 'gazette', 'statutory_code')),
    jurisdiction TEXT NOT NULL DEFAULT 'India (Central)',
    supported_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    retrieval_status TEXT NOT NULL DEFAULT 'active' CHECK (retrieval_status IN ('active', 'limited', 'inaccessible', 'rate_limited')),
    verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'provisional', 'unverified')),
    access_limitations TEXT,
    last_discovered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.government_sources IS 'Structured registry of official Indian government portals and authoritative document sources.';

-- 2. Discovered Government Services
CREATE TABLE IF NOT EXISTS public.government_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT REFERENCES public.government_sources(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    service_code TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'India (Central)',
    official_url TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.government_services IS 'Authoritative government services discovered across verified official portals.';

CREATE INDEX IF NOT EXISTS idx_gov_services_code ON public.government_services(service_code);
CREATE INDEX IF NOT EXISTS idx_gov_services_category ON public.government_services(category);

-- 3. Service Application Types & Lifecycle Tracking
CREATE TABLE IF NOT EXISTS public.service_application_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.government_services(id) ON DELETE CASCADE,
    application_name TEXT NOT NULL,
    variant_code TEXT NOT NULL,
    applicant_category TEXT DEFAULT 'general',
    requirements_version TEXT NOT NULL DEFAULT '2024.1',
    lifecycle_status TEXT NOT NULL DEFAULT 'discovered' CHECK (
        lifecycle_status IN ('discovered', 'downloaded', 'extracted', 'needs_verification', 'verified', 'published', 'superseded')
    ),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (service_id, variant_code, requirements_version)
);

COMMENT ON TABLE public.service_application_types IS 'Application variants with requirement lifecycle states (discovered -> extracted -> verified -> published).';

CREATE INDEX IF NOT EXISTS idx_service_app_types_lifecycle ON public.service_application_types(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_service_app_types_variant ON public.service_application_types(variant_code);

-- 4. Official Forms & Documents Catalog (Content Hashed & Deduplicated)
CREATE TABLE IF NOT EXISTS public.official_documents_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type_id UUID REFERENCES public.service_application_types(id) ON DELETE SET NULL,
    source_id TEXT REFERENCES public.government_sources(id) ON DELETE SET NULL,
    form_identifier TEXT NOT NULL,
    title TEXT NOT NULL,
    source_url TEXT NOT NULL,
    file_format TEXT NOT NULL DEFAULT 'pdf' CHECK (file_format IN ('pdf', 'html', 'docx', 'csv', 'json', 'xml', 'other')),
    content_hash_sha256 TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    effective_date DATE,
    extraction_status TEXT NOT NULL DEFAULT 'discovered' CHECK (extraction_status IN ('discovered', 'downloaded', 'extracted', 'failed')),
    extraction_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.official_documents_catalog IS 'Deduplicated catalog of official government forms and guidance documents with SHA-256 provenance.';

CREATE INDEX IF NOT EXISTS idx_official_docs_hash ON public.official_documents_catalog(content_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_official_docs_form_id ON public.official_documents_catalog(form_identifier);

-- 5. Structured Document Requirements (Mandatory, Conditional, Alternative, Optional)
CREATE TABLE IF NOT EXISTS public.application_document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type_id UUID NOT NULL REFERENCES public.service_application_types(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    requirement_classification TEXT NOT NULL DEFAULT 'mandatory' CHECK (
        requirement_classification IN ('mandatory', 'conditional', 'alternative', 'optional')
    ),
    condition_expression TEXT,
    accepted_alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_evidence TEXT,
    source_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'extracted' CHECK (
        verification_status IN ('extracted', 'needs_review', 'verified', 'rejected')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.application_document_requirements IS 'Statutory and documentary requirements extracted from official forms and instructions.';

CREATE INDEX IF NOT EXISTS idx_doc_reqs_app_type ON public.application_document_requirements(application_type_id);
CREATE INDEX IF NOT EXISTS idx_doc_reqs_classification ON public.application_document_requirements(requirement_classification);

-- 6. Dynamic Conditional Questions
CREATE TABLE IF NOT EXISTS public.application_conditional_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type_id UUID NOT NULL REFERENCES public.service_application_types(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    question_text TEXT NOT NULL,
    response_type TEXT NOT NULL DEFAULT 'boolean' CHECK (response_type IN ('boolean', 'select', 'text', 'number')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_value TEXT,
    help_text TEXT,
    activates_document_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (application_type_id, question_key)
);

COMMENT ON TABLE public.application_conditional_questions IS 'Eligibility and situational questions that dynamically activate conditional documentary requirements.';

CREATE INDEX IF NOT EXISTS idx_cond_questions_app_type ON public.application_conditional_questions(application_type_id);

-- 7. Automated Ingestion & Discovery Runs Log
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    run_type TEXT NOT NULL DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled', 'incremental_resume')),
    sources_scanned INTEGER NOT NULL DEFAULT 0,
    resources_discovered INTEGER NOT NULL DEFAULT 0,
    resources_downloaded INTEGER NOT NULL DEFAULT 0,
    resources_parsed INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    report_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'interrupted', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.ingestion_runs IS 'Audit log of automated discovery and form extraction runs with coverage metrics.';

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_created_at ON public.ingestion_runs(created_at DESC);

-- 8. Enable Row-Level Security on All New Tables
ALTER TABLE public.government_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_application_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_documents_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_conditional_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

-- 9. Row-Level Security Policies
-- Authenticated users (Applicants, Officers, Admins) can read official sources & active services
DROP POLICY IF EXISTS "gov_sources_read" ON public.government_sources;
CREATE POLICY "gov_sources_read" ON public.government_sources
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "gov_services_read" ON public.government_services;
CREATE POLICY "gov_services_read" ON public.government_services
    FOR SELECT TO authenticated USING (status = 'active');

DROP POLICY IF EXISTS "service_app_types_read" ON public.service_application_types;
CREATE POLICY "service_app_types_read" ON public.service_application_types
    FOR SELECT TO authenticated
    USING (
        lifecycle_status = 'published'
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('administrator', 'officer')
        )
    );

DROP POLICY IF EXISTS "official_docs_read" ON public.official_documents_catalog;
CREATE POLICY "official_docs_read" ON public.official_documents_catalog
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "doc_reqs_read" ON public.application_document_requirements;
CREATE POLICY "doc_reqs_read" ON public.application_document_requirements
    FOR SELECT TO authenticated
    USING (
        verification_status = 'verified'
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "cond_questions_read" ON public.application_conditional_questions;
CREATE POLICY "cond_questions_read" ON public.application_conditional_questions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ingestion_runs_read" ON public.ingestion_runs;
CREATE POLICY "ingestion_runs_read" ON public.ingestion_runs
    FOR SELECT TO authenticated USING (true);

-- Admin mutation permissions
DROP POLICY IF EXISTS "admin_manage_gov_sources" ON public.government_sources;
CREATE POLICY "admin_manage_gov_sources" ON public.government_sources
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "admin_manage_gov_services" ON public.government_services;
CREATE POLICY "admin_manage_gov_services" ON public.government_services
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "admin_manage_app_types" ON public.service_application_types;
CREATE POLICY "admin_manage_app_types" ON public.service_application_types
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "admin_manage_doc_catalog" ON public.official_documents_catalog;
CREATE POLICY "admin_manage_doc_catalog" ON public.official_documents_catalog
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "admin_manage_doc_reqs" ON public.application_document_requirements;
CREATE POLICY "admin_manage_doc_reqs" ON public.application_document_requirements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "admin_manage_cond_questions" ON public.application_conditional_questions;
CREATE POLICY "admin_manage_cond_questions" ON public.application_conditional_questions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "admin_manage_ingestion_runs" ON public.ingestion_runs;
CREATE POLICY "admin_manage_ingestion_runs" ON public.ingestion_runs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );
