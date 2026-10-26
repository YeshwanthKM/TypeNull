-- ==============================================================================
-- TypeNull Database Schema Migration: 011_authentication_and_institution_verification.sql
-- Phase 2: Dual Role Model (Institution & AICTE Officer) & Institution Verification Workflow
-- ==============================================================================

-- 1. Ensure public.profiles has strict role constraints accommodating both legacy and new roles
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('institution', 'officer', 'applicant', 'administrator'));

-- 2. Add institutional verification and administrative permission columns
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS institution_name TEXT,
    ADD COLUMN IF NOT EXISTS aicte_permanent_id TEXT,
    ADD COLUMN IF NOT EXISTS institution_type TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS contact_person_designation TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending_verification',
    ADD COLUMN IF NOT EXISTS verification_reason TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Constraint on verification_status
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_verification_status_check
    CHECK (verification_status IN ('pending_verification', 'additional_info_required', 'verified', 'rejected'));

-- 3. Safely map legacy roles to the strict two-role model:
-- 'applicant' -> 'institution'
-- 'administrator' -> 'officer' with is_admin = true
UPDATE public.profiles
SET role = 'institution'
WHERE role = 'applicant';

UPDATE public.profiles
SET role = 'officer', is_admin = true
WHERE role = 'administrator';

-- 4. Create Institution Verification Audits Table
CREATE TABLE IF NOT EXISTS public.institution_verification_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_info')),
    reason_or_message TEXT,
    from_status TEXT,
    to_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inst_verif_audits_institution ON public.institution_verification_audits(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_verif_audits_reviewer ON public.institution_verification_audits(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_inst_verif_audits_created ON public.institution_verification_audits(created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE public.institution_verification_audits ENABLE ROW LEVEL SECURITY;

-- Institutions can read audit logs concerning their own institution; officers can view all
DROP POLICY IF EXISTS "institutions_read_own_verif_audits" ON public.institution_verification_audits;
CREATE POLICY "institutions_read_own_verif_audits"
    ON public.institution_verification_audits
    FOR SELECT
    TO authenticated
    USING (
        institution_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'officer' OR p.role = 'administrator')
        )
    );

-- 5. Strict Security Trigger: Protect Role, is_admin, and Verification Status
-- Clients (institutions or regular officers) CANNOT modify their own role, administrative flag, or verification status.
CREATE OR REPLACE FUNCTION public.protect_profile_role_and_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if restricted columns are being altered
    IF NEW.role IS DISTINCT FROM OLD.role 
       OR NEW.is_admin IS DISTINCT FROM OLD.is_admin 
       OR NEW.verification_status IS DISTINCT FROM OLD.verification_status 
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at 
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        
        -- Allow service_role key, superuser, and trusted RPC procedures
        IF (auth.role() = 'authenticated' OR auth.role() = 'anon') 
           AND COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
            
            -- If caller is modifying verification_status, verify they are an officer with is_admin = true
            IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
                IF NOT EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid() AND (role = 'officer' OR role = 'administrator') AND is_admin = true
                ) THEN
                    RAISE EXCEPTION 'Unauthorised: Only an AICTE Officer with administrative permission may modify institution verification status.';
                END IF;
            ELSE
                -- Block client role or is_admin mutation outright
                RAISE EXCEPTION 'Unauthorised: Client accounts cannot modify user roles or administrative permissions.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_role_and_permissions ON public.profiles;
CREATE TRIGGER trg_protect_profile_role_and_permissions
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role_and_permissions();

-- 6. Update handle_new_user() Trigger on Public Signup
-- Guarantees that public self-service registration ALWAYS creates an 'institution' account
-- with pending_verification and is_admin = false.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        role,
        is_admin,
        institution_name,
        aicte_permanent_id,
        institution_type,
        address,
        state,
        contact_person_designation,
        contact_phone,
        verification_status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'institution', -- Strictly default to institution
        false,         -- Never admin
        COALESCE(NEW.raw_user_meta_data->>'institution_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'aicte_permanent_id', ''),
        COALESCE(NEW.raw_user_meta_data->>'institution_type', 'Engineering & Technology'),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        COALESCE(NEW.raw_user_meta_data->>'state', ''),
        COALESCE(NEW.raw_user_meta_data->>'contact_person_designation', ''),
        COALESCE(NEW.raw_user_meta_data->>'contact_phone', ''),
        'pending_verification', -- Strictly pending verification
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        institution_name = COALESCE(NULLIF(EXCLUDED.institution_name, ''), public.profiles.institution_name),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- 7. Secure Server-Side Procedure for Administrative Institution Verification
CREATE OR REPLACE FUNCTION public.review_institution_registration(
    target_institution_id UUID,
    review_action TEXT,
    reason_message TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    caller_role TEXT;
    caller_is_admin BOOLEAN;
    current_status TEXT;
    new_status TEXT;
BEGIN
    -- Verify caller
    SELECT role, is_admin INTO caller_role, caller_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_role NOT IN ('officer', 'administrator') OR caller_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorised: Administrative officer clearance required to review institution registration.';
    END IF;

    IF review_action NOT IN ('approve', 'reject', 'request_info') THEN
        RAISE EXCEPTION 'Invalid review action: %. Must be approve, reject, or request_info.', review_action;
    END IF;

    SELECT verification_status INTO current_status
    FROM public.profiles
    WHERE id = target_institution_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Institution profile with ID % not found.', target_institution_id;
    END IF;

    -- Determine new status
    IF review_action = 'approve' THEN
        new_status := 'verified';
    ELSIF review_action = 'reject' THEN
        IF reason_message IS NULL OR trim(reason_message) = '' THEN
            RAISE EXCEPTION 'A reason is required when rejecting an institution registration.';
        END IF;
        new_status := 'rejected';
    ELSIF review_action = 'request_info' THEN
        IF reason_message IS NULL OR trim(reason_message) = '' THEN
            RAISE EXCEPTION 'A message is required when requesting additional information.';
        END IF;
        new_status := 'additional_info_required';
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET verification_status = new_status,
        verification_reason = reason_message,
        verified_at = CASE WHEN review_action = 'approve' THEN timezone('utc'::text, now()) ELSE verified_at END,
        verified_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE id = target_institution_id;

    -- Log audit entry
    INSERT INTO public.institution_verification_audits (
        institution_id,
        reviewer_id,
        action,
        reason_or_message,
        from_status,
        to_status,
        created_at
    )
    VALUES (
        target_institution_id,
        auth.uid(),
        CASE review_action 
            WHEN 'approve' THEN 'approved' 
            WHEN 'reject' THEN 'rejected' 
            ELSE 'requested_info' 
        END,
        reason_message,
        current_status,
        new_status,
        timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'institution_id', target_institution_id,
        'new_status', new_status
    );
END;
$$;

-- 8. Allow Officers to View All Institution Profiles
DROP POLICY IF EXISTS "officers_view_institution_profiles" ON public.profiles;
CREATE POLICY "officers_view_institution_profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'officer' OR p.role = 'administrator')
        )
    );
