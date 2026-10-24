-- ==============================================================================
-- TypeNull Database Schema Migration: 004_auth_roles_and_organisations.sql
-- Role-Based Access Control (RBAC) & Organisation Membership Foundation
-- ==============================================================================

-- 1. Add role column to public.profiles with strict check constraint
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'applicant'
    CHECK (role IN ('applicant', 'officer', 'administrator'));

COMMENT ON COLUMN public.profiles.role IS 'Verified application role: applicant, officer, or administrator.';

-- Ensure any existing rows without a role default to 'applicant'
UPDATE public.profiles
SET role = 'applicant'
WHERE role IS NULL;

-- 2. Index on profile roles for fast authorization lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Security Trigger: Prevent clients from mutating their own role
-- Users may update full_name, but CANNOT escalate privileges by altering 'role'.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is being changed:
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Block only if the request originates from a standard web client (authenticated or anon)
        -- without a service_role key. Direct SQL Editor and postgres administrative operations are permitted.
        IF (auth.role() = 'authenticated' OR auth.role() = 'anon') 
           AND COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
            RAISE EXCEPTION 'Unauthorised: User roles cannot be modified through client profile updates.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- 4. Update handle_new_user() Trigger on Auth Signup
-- Guarantees that public self-service registration ALWAYS creates an 'applicant' account.
-- Even if a user attempts to supply a privileged role in metadata, it is strictly ignored.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'applicant', -- Always assign applicant role on public signup
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- 5. Administrative Function for Secure Role Assignment
-- Trusted server-side procedure for assigning officer or administrator roles.
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, target_role TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF target_role NOT IN ('applicant', 'officer', 'administrator') THEN
        RAISE EXCEPTION 'Invalid role: %. Role must be applicant, officer, or administrator.', target_role;
    END IF;

    UPDATE public.profiles
    SET role = target_role,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile with ID % not found.', target_user_id;
    END IF;
END;
$$;

-- 6. Organisation Membership Foundation
-- Minimal, backward-compatible schema for multi-category organisations and authorized officers.
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'regulatory_body',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.organisations IS 'Statutory and evaluating organisations that review submitted dossiers.';

CREATE TABLE IF NOT EXISTS public.organisation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_role TEXT NOT NULL DEFAULT 'officer' CHECK (member_role IN ('officer', 'lead_officer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (organisation_id, user_id)
);

COMMENT ON TABLE public.organisation_members IS 'Maps authorized officers to specific evaluating organisations.';

-- 7. Add assigned_organisation_id to public.applications
-- Backward-compatible: NULL for existing drafts and unassigned applications.
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS assigned_organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_applications_assigned_org ON public.applications(assigned_organisation_id);

-- 8. Row-Level Security for Organisations and Memberships
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read organisation metadata (for selection during formal submission)
DROP POLICY IF EXISTS "organisations_select_all" ON public.organisations;
CREATE POLICY "organisations_select_all"
    ON public.organisations
    FOR SELECT
    TO authenticated
    USING (true);

-- Officers can view memberships linked to their user ID
DROP POLICY IF EXISTS "organisation_members_select_own" ON public.organisation_members;
CREATE POLICY "organisation_members_select_own"
    ON public.organisation_members
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 9. Officer RLS Access Policy on Applications
-- Officers can view applications ONLY if:
--   a) The application has been formally submitted (status != 'draft')
--   b) The application is assigned to an organisation they are authorised to represent
-- Applicants' private drafts remain strictly invisible to officers.
DROP POLICY IF EXISTS "applications_officer_select" ON public.applications;
CREATE POLICY "applications_officer_select"
    ON public.applications
    FOR SELECT
    TO authenticated
    USING (
        status != 'draft'
        AND assigned_organisation_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.organisation_id = public.applications.assigned_organisation_id
              AND om.user_id = auth.uid()
        )
    );
