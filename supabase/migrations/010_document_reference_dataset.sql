-- ==============================================================================
-- TypeNull Database Schema Migration: 010_document_reference_dataset.sql
-- Document Reference Dataset, Provenance Tracking & Authenticity Verification
-- ==============================================================================

-- 1. Create document_reference_types Table
CREATE TABLE IF NOT EXISTS public.document_reference_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    application_category TEXT NOT NULL,
    issuing_authority TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'India',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.document_reference_types IS 'Catalogue of supported document types for template comparison and authenticity checking.';

-- 2. Create document_reference_templates Table
CREATE TABLE IF NOT EXISTS public.document_reference_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID NOT NULL REFERENCES public.document_reference_types(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_synthetic BOOLEAN NOT NULL DEFAULT false,
    provenance TEXT NOT NULL CHECK (provenance IN ('synthetic_demo', 'official_gazette', 'regulatory_standard', 'internal_curation')),
    review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'retired', 'rejected')),
    last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approval_notes TEXT,
    expected_page_structure JSONB NOT NULL DEFAULT '{"pageCount": 1, "dimensions": {"width": 612, "height": 792}, "orientation": "portrait"}'::jsonb,
    expected_headings JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_qr_structure JSONB,
    digital_signature_requirements TEXT NOT NULL DEFAULT 'optional' CHECK (digital_signature_requirements IN ('mandatory', 'optional', 'unsupported')),
    official_verification_method TEXT NOT NULL DEFAULT 'none',
    official_verification_source TEXT NOT NULL DEFAULT 'none',
    reference_file_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_ref_template_type_version UNIQUE (document_type_id, version)
);

COMMENT ON TABLE public.document_reference_templates IS 'Versioned trusted reference templates with structural criteria, validation rules, and provenance.';

-- 3. Create document_authenticity_assessments Table
CREATE TABLE IF NOT EXISTS public.document_authenticity_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.application_documents(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    detected_document_type TEXT NOT NULL,
    claimed_issuing_authority TEXT NOT NULL,
    selected_reference_id UUID REFERENCES public.document_reference_templates(id) ON DELETE SET NULL,
    selected_reference_version TEXT,
    selected_reference_provenance TEXT,
    reference_trust_status TEXT,
    selection_reason TEXT,
    ocr_status TEXT NOT NULL DEFAULT 'completed',
    structural_comparison_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    field_comparison_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    alteration_indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
    qr_and_signature_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
    issuer_verification_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    checks_not_performed JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_next_action TEXT,
    status_dimensions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.document_authenticity_assessments IS 'Auditable record of multi-dimensional authenticity evaluations, template comparisons, and issuer verification outcomes.';

-- 4. Indexes for Efficient Querying and Audit Retrieval
CREATE INDEX IF NOT EXISTS idx_ref_templates_doc_type ON public.document_reference_templates(document_type_id);
CREATE INDEX IF NOT EXISTS idx_ref_templates_status ON public.document_reference_templates(review_status);
CREATE INDEX IF NOT EXISTS idx_authenticity_assessments_doc ON public.document_authenticity_assessments(document_id);
CREATE INDEX IF NOT EXISTS idx_authenticity_assessments_app ON public.document_authenticity_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_authenticity_assessments_user ON public.document_authenticity_assessments(user_id);

-- 5. Row Level Security Policies

ALTER TABLE public.document_reference_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reference_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_authenticity_assessments ENABLE ROW LEVEL SECURITY;

-- 5.1 document_reference_types policies
DROP POLICY IF EXISTS "ref_types_select" ON public.document_reference_types;
CREATE POLICY "ref_types_select"
    ON public.document_reference_types
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "ref_types_admin_manage" ON public.document_reference_types;
CREATE POLICY "ref_types_admin_manage"
    ON public.document_reference_types
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

-- 5.2 document_reference_templates policies
DROP POLICY IF EXISTS "ref_templates_select" ON public.document_reference_templates;
CREATE POLICY "ref_templates_select"
    ON public.document_reference_templates
    FOR SELECT
    TO authenticated
    USING (
        review_status = 'approved'
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "ref_templates_admin_manage" ON public.document_reference_templates;
CREATE POLICY "ref_templates_admin_manage"
    ON public.document_reference_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

-- 5.3 document_authenticity_assessments policies
DROP POLICY IF EXISTS "authenticity_assessments_select" ON public.document_authenticity_assessments;
CREATE POLICY "authenticity_assessments_select"
    ON public.document_authenticity_assessments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
        OR EXISTS (
            SELECT 1 FROM public.applications a
            JOIN public.organisation_members om ON om.organisation_id = a.assigned_organisation_id
            WHERE a.id = application_id AND om.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "authenticity_assessments_insert" ON public.document_authenticity_assessments;
CREATE POLICY "authenticity_assessments_insert"
    ON public.document_authenticity_assessments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('administrator', 'officer')
        )
    );
