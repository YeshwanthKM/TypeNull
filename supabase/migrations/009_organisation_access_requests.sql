-- ==============================================================================
-- TypeNull Database Schema Migration: 009_organisation_access_requests.sql
-- User-to-Organisation Access Request Workflow & Secure Membership Management
-- ==============================================================================

-- 1. Create organisation_access_requests Table
CREATE TABLE IF NOT EXISTS public.organisation_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.organisation_access_requests IS 'Tracks user requests to join institutional evaluation organisations and their admin review outcomes.';
COMMENT ON COLUMN public.organisation_access_requests.status IS 'Current request state: pending, approved, or rejected.';

-- 2. Indexes for Fast Filtering and Tenancy Lookups
CREATE INDEX IF NOT EXISTS idx_org_access_requests_user ON public.organisation_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_org_access_requests_org ON public.organisation_access_requests(organisation_id);
CREATE INDEX IF NOT EXISTS idx_org_access_requests_status ON public.organisation_access_requests(status);

-- 3. Strict Constraint: Prevent duplicate pending requests for the same organisation by a single user
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_user_org_request 
ON public.organisation_access_requests(user_id, organisation_id) 
WHERE status = 'pending';

-- 4. Row-Level Security for organisation_access_requests
ALTER TABLE public.organisation_access_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can inspect their own requests; Administrators can inspect all requests across organisations
DROP POLICY IF EXISTS "org_access_requests_select" ON public.organisation_access_requests;
CREATE POLICY "org_access_requests_select"
    ON public.organisation_access_requests
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

-- INSERT: Authenticated users can submit a request only for themselves with initial 'pending' status
DROP POLICY IF EXISTS "org_access_requests_insert" ON public.organisation_access_requests;
CREATE POLICY "org_access_requests_insert"
    ON public.organisation_access_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND reviewed_at IS NULL
        AND reviewed_by IS NULL
        AND review_note IS NULL
    );

-- UPDATE: Only administrators can update access requests (to approve or reject)
-- Enforces self-review defense: An administrator CANNOT approve their own request
DROP POLICY IF EXISTS "org_access_requests_update_admin" ON public.organisation_access_requests;
CREATE POLICY "org_access_requests_update_admin"
    ON public.organisation_access_requests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
        AND auth.uid() <> user_id
    );

-- 5. Extend RLS on organisation_members for Administrator Governance
DROP POLICY IF EXISTS "organisation_members_select" ON public.organisation_members;
CREATE POLICY "organisation_members_select"
    ON public.organisation_members
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

DROP POLICY IF EXISTS "organisation_members_admin_manage" ON public.organisation_members;
CREATE POLICY "organisation_members_admin_manage"
    ON public.organisation_members
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'administrator'
        )
    );

-- 6. Server-Side Administrative Review Procedures (Atomic Transactions)

-- Approve procedure: validates non-self review, records reviewer, sets status, and grants membership
CREATE OR REPLACE FUNCTION public.approve_organisation_access_request(
    target_request_id UUID,
    admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    req RECORD;
    caller_role TEXT;
BEGIN
    -- Verify caller is an administrator
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role <> 'administrator' THEN
        RAISE EXCEPTION 'Unauthorised: Only platform administrators can approve organisation access requests.';
    END IF;

    -- Fetch and lock the target request
    SELECT * INTO req FROM public.organisation_access_requests WHERE id = target_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access request with ID % not found.', target_request_id;
    END IF;

    IF req.status <> 'pending' THEN
        RAISE EXCEPTION 'Request is already resolved with status "%".', req.status;
    END IF;

    -- Security Guard: Administrator cannot approve their own request
    IF req.user_id = auth.uid() THEN
        RAISE EXCEPTION 'Security Violation: Administrators cannot approve their own organisation access requests.';
    END IF;

    -- Update request status
    UPDATE public.organisation_access_requests
    SET status = 'approved',
        reviewed_at = timezone('utc'::text, now()),
        reviewed_by = auth.uid(),
        review_note = admin_note,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_request_id;

    -- Grant organisation membership
    INSERT INTO public.organisation_members (organisation_id, user_id, member_role, created_at)
    VALUES (req.organisation_id, req.user_id, 'officer', timezone('utc'::text, now()))
    ON CONFLICT (organisation_id, user_id) DO NOTHING;

    -- If user was an applicant, upgrade platform clearance to officer
    UPDATE public.profiles
    SET role = 'officer',
        updated_at = timezone('utc'::text, now())
    WHERE id = req.user_id AND role = 'applicant';

    RETURN jsonb_build_object('success', true, 'request_id', target_request_id, 'status', 'approved');
END;
$$;

-- Reject procedure: validates non-self review, records reviewer, sets status, preserves existing permissions
CREATE OR REPLACE FUNCTION public.reject_organisation_access_request(
    target_request_id UUID,
    admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    req RECORD;
    caller_role TEXT;
BEGIN
    -- Verify caller is an administrator
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role <> 'administrator' THEN
        RAISE EXCEPTION 'Unauthorised: Only platform administrators can reject organisation access requests.';
    END IF;

    -- Fetch and lock the target request
    SELECT * INTO req FROM public.organisation_access_requests WHERE id = target_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access request with ID % not found.', target_request_id;
    END IF;

    IF req.status <> 'pending' THEN
        RAISE EXCEPTION 'Request is already resolved with status "%".', req.status;
    END IF;

    -- Security Guard: Administrator cannot review their own request
    IF req.user_id = auth.uid() THEN
        RAISE EXCEPTION 'Security Violation: Administrators cannot review their own organisation access requests.';
    END IF;

    -- Update request status
    UPDATE public.organisation_access_requests
    SET status = 'rejected',
        reviewed_at = timezone('utc'::text, now()),
        reviewed_by = auth.uid(),
        review_note = admin_note,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_request_id;

    RETURN jsonb_build_object('success', true, 'request_id', target_request_id, 'status', 'rejected');
END;
$$;
