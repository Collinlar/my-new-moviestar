-- MuvieStars: erase an account, completely, so the privacy page's deletion promise is true.
--
-- Two problems found while writing the privacy page:
--   1. Deleting a person from auth.users would have FAILED for anyone who had ever voted or acted as an
--      administrator. The awards audit log is write-once, but its link to the person is "ON DELETE SET NULL",
--      and setting it to NULL counts as an edit, which the write-once rule refused.
--   2. Several older tables (profiles and a few others) hold a user_id with no foreign key, so deleting the sign-in
--      alone would have left a person's profile and activity behind.
--
-- This migration fixes both. The one change the audit log now allows is detaching an erased account from its own
-- entries. Nothing else about an entry can change, and nothing can be deleted.
--
-- To erase an account, run this in the Supabase SQL editor (replace the id with the person's):
--     select public.account_erase('00000000-0000-0000-0000-000000000000');
-- Try it on a throwaway test account first. It cannot be undone.
-- Safe to run more than once.

-- 1. The audit log may detach an erased account, and nothing else ---------------------------------------------
CREATE OR REPLACE FUNCTION public.award_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'award_audit_log'
     AND OLD.actor_user_id IS NOT NULL AND NEW.actor_user_id IS NULL
     AND (to_jsonb(NEW) - 'actor_user_id') = (to_jsonb(OLD) - 'actor_user_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'The awards audit log cannot be changed or deleted' USING ERRCODE = '42501';
END;
$$;

-- 2. Erasing an account ---------------------------------------------------------------------------------------
-- Removes the person's rows from every table that keeps a user_id, then the sign-in itself. Tables whose link
-- already says "set to null when the person goes" are left to do exactly that: a named judge stays named, and
-- a laurel download stays in the log without a name. Returns how many rows went from each table.
CREATE OR REPLACE FUNCTION public.account_erase(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  n integer;
  v_removed jsonb := '{}'::jsonb;
BEGIN
  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user) THEN
    RAISE EXCEPTION 'No account has that id' USING ERRCODE = '23514';
  END IF;

  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables x ON x.table_schema = c.table_schema AND x.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'user_id'
      AND c.data_type = 'uuid'
      AND x.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('award_jurors', 'award_laurel_downloads')
    ORDER BY c.table_name
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t.table_name) USING p_user;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN v_removed := v_removed || jsonb_build_object(t.table_name, n); END IF;
  END LOOP;

  DELETE FROM auth.users WHERE id = p_user;
  RETURN v_removed;
END;
$$;

-- Only the database owner (the SQL editor) can run it. No signed-in user and no visitor can.
REVOKE ALL ON FUNCTION public.account_erase(uuid) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.account_erase(uuid) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.account_erase(uuid) FROM authenticated';
  END IF;
END $$;
