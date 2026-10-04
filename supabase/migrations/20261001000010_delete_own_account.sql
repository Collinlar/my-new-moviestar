-- MuvieStars: let a signed-in person delete their own account from the account page.
--
-- This is the self-serve door to account_erase (migration 9), which stays closed to everyone but the database
-- owner. The person must type DELETE, and they can only ever erase themselves. Administrators are refused
-- here, so nobody locks the awards team out by accident: another administrator removes the role first.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.delete_own_account(p_confirm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in first, then try again' USING ERRCODE = '42501';
  END IF;
  IF upper(btrim(coalesce(p_confirm, ''))) <> 'DELETE' THEN
    RAISE EXCEPTION 'Type DELETE to confirm' USING ERRCODE = '23514';
  END IF;
  IF public.is_admin() THEN
    RAISE EXCEPTION 'An administrator account cannot be deleted from here. Ask another administrator to remove the admin role first' USING ERRCODE = '23514';
  END IF;
  PERFORM public.account_erase(auth.uid());
END;
$$;

-- Signed-in people only. Visitors cannot call it.
REVOKE ALL ON FUNCTION public.delete_own_account(text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.delete_own_account(text) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_own_account(text) TO authenticated';
  END IF;
END $$;
