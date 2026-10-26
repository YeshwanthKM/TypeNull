-- ==============================================================================
-- TypeNull Database Schema Rollback: 011_authentication_and_institution_verification_rollback.sql
-- Rollback for Phase 2 Dual-Role & Institution Verification Changes
-- ==============================================================================

-- 1. Drop the review function
DROP FUNCTION IF EXISTS public.review_institution_registration(UUID, TEXT, TEXT);

-- 2. Drop policies on profiles and audits
DROP POLICY IF EXISTS "officers_view_institution_profiles" ON public.profiles;
DROP POLICY IF EXISTS "institutions_read_own_verif_audits" ON public.institution_verification_audits;

-- 3. Drop audits table
DROP TABLE IF EXISTS public.institution_verification_audits CASCADE;

-- 4. Revert trigger and function for profile role protection
DROP TRIGGER IF EXISTS trg_protect_profile_role_and_permissions ON public.profiles;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF (auth.role() = 'authenticated' OR auth.role() = 'anon') 
           AND COALESCE(auth.jwt()->>'role', '') <> 'service_role' THEN
            RAISE EXCEPTION 'Unauthorised: Client accounts cannot modify user roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- 5. Revert handle_new_user() trigger
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
        'applicant',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- 6. Revert role updates (optional/best-effort)
UPDATE public.profiles
SET role = 'applicant'
WHERE role = 'institution';

UPDATE public.profiles
SET role = 'administrator'
WHERE role = 'officer' AND is_admin = true;

-- 7. Drop added columns and restore role constraint
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

ALTER TABLE public.profiles
    DROP COLUMN IF EXISTS institution_name,
    DROP COLUMN IF EXISTS aicte_permanent_id,
    DROP COLUMN IF EXISTS institution_type,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS state,
    DROP COLUMN IF EXISTS contact_person_designation,
    DROP COLUMN IF EXISTS contact_phone,
    DROP COLUMN IF EXISTS is_admin,
    DROP COLUMN IF EXISTS verification_status,
    DROP COLUMN IF EXISTS verification_reason,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS verified_by;

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('applicant', 'officer', 'administrator'));
