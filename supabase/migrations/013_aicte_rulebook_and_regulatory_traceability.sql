-- ==============================================================================
-- TypeNull Database Schema Migration: 013_aicte_rulebook_and_regulatory_traceability.sql
-- Dedicated AICTE Rulebook, Versioned Regulatory Sources & Traceability Model
-- Grounded in AICTE Approval Process Handbook (APH) 2024–2027
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Official AICTE Regulatory Sources Library
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aicte_regulatory_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    short_title TEXT NOT NULL,
    academic_year_range TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('handbook', 'gazette_notification', 'circular', 'public_notice', 'statutory_act')),
    issuing_authority TEXT NOT NULL,
    source_url TEXT NOT NULL,
    publication_date DATE,
    effective_date DATE,
    is_current_applicable BOOLEAN NOT NULL DEFAULT true,
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.aicte_regulatory_sources IS 'Authoritative library of official AICTE Approval Process Handbooks, gazette notifications, and statutory circulars.';

-- -----------------------------------------------------------------------------
-- 2. Structured AICTE Regulatory Rules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aicte_regulatory_rules (
    id TEXT PRIMARY KEY,
    source_id TEXT REFERENCES public.aicte_regulatory_sources(id) ON DELETE RESTRICT,
    rule_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL CHECK (topic IN ('approval_process', 'infrastructure', 'faculty_cadre', 'financial_legal', 'accreditation')),
    chapter_or_appendix TEXT NOT NULL,
    clause_or_section TEXT NOT NULL,
    applicable_category TEXT NOT NULL CHECK (applicable_category IN ('extension_of_approval', 'all_technical_institutions', 'new_institutions')),
    institution_applicability TEXT NOT NULL,
    verification_status TEXT NOT NULL CHECK (verification_status IN ('verified', 'conditional', 'unverified', 'superseded')),
    official_text_excerpt TEXT NOT NULL,
    plain_language_explanation TEXT NOT NULL,
    institutional_action TEXT NOT NULL,
    compliance_evidence TEXT NOT NULL,
    required_document_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies_or_exceptions TEXT,
    last_verified_date DATE NOT NULL,
    version TEXT NOT NULL DEFAULT '2024-2027.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.aicte_regulatory_rules IS 'Granular statutory rules with plain-language explanations, official excerpts, and document mappings.';

CREATE INDEX IF NOT EXISTS idx_aicte_rules_topic ON public.aicte_regulatory_rules(topic);
CREATE INDEX IF NOT EXISTS idx_aicte_rules_status ON public.aicte_regulatory_rules(verification_status);
CREATE INDEX IF NOT EXISTS idx_aicte_rules_category ON public.aicte_regulatory_rules(applicable_category);

-- -----------------------------------------------------------------------------
-- 3. Institution Compliance Self-Assessment Records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aicte_institution_compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL REFERENCES public.aicte_regulatory_rules(id) ON DELETE CASCADE,
    compliance_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (compliance_status IN ('compliant', 'in_progress', 'deficiency_noted', 'not_applicable')),
    evidence_document_id UUID REFERENCES public.application_documents(id) ON DELETE SET NULL,
    institution_notes TEXT,
    officer_verified BOOLEAN NOT NULL DEFAULT false,
    officer_notes TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (institution_id, rule_id)
);

COMMENT ON TABLE public.aicte_institution_compliance_records IS 'Institutional compliance tracking against specific AICTE regulatory rules.';

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Configuration
-- -----------------------------------------------------------------------------
ALTER TABLE public.aicte_regulatory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aicte_regulatory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aicte_institution_compliance_records ENABLE ROW LEVEL SECURITY;

-- Public/Authenticated Read Access for Rulebook & Sources
CREATE POLICY "Allow public read access to regulatory sources"
    ON public.aicte_regulatory_sources FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to regulatory rules"
    ON public.aicte_regulatory_rules FOR SELECT
    USING (true);

-- Officer-Only Regulatory Content Management (Restricted to is_admin = true)
CREATE POLICY "Allow authorized officers to manage regulatory sources"
    ON public.aicte_regulatory_sources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'officer'
              AND is_admin = true
        )
    );

CREATE POLICY "Allow authorized officers to manage regulatory rules"
    ON public.aicte_regulatory_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'officer'
              AND is_admin = true
        )
    );

-- Institution Compliance Record Access
CREATE POLICY "Institutions can view their own compliance records"
    ON public.aicte_institution_compliance_records FOR SELECT
    USING (
        institution_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'officer'
        )
    );

CREATE POLICY "Institutions can update their own compliance records"
    ON public.aicte_institution_compliance_records FOR ALL
    USING (institution_id = auth.uid())
    WITH CHECK (institution_id = auth.uid());

CREATE POLICY "Officers can review compliance records"
    ON public.aicte_institution_compliance_records FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'officer'
        )
    );

COMMIT;
