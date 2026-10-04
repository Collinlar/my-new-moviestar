-- MuvieStars Awards: make the 90-day promise on vote connection hashes true on its own.
--
-- The privacy page says a vote's connection hash is kept for fraud checks and removed after 90 days.
-- Until now the removal only ran when somebody cast a vote, so a quiet stretch with no voting would have kept
-- hashes longer. This adds a purge that does not depend on anyone voting, and schedules it daily when the
-- pg_cron extension is switched on in Supabase (Database, Extensions). Without pg_cron the existing sweep inside
-- award_cast_vote still runs, and an administrator can call the function by hand.
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.award_purge_vote_hashes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cleared integer;
BEGIN
  UPDATE public.award_votes SET ip_hash = NULL
    WHERE ip_hash IS NOT NULL AND created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_cleared = ROW_COUNT;
  RETURN v_cleared;
END;
$$;

-- Not for visitors or signed-in users. The scheduler and the database owner run it.
REVOKE ALL ON FUNCTION public.award_purge_vote_hashes() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_purge_vote_hashes() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_purge_vote_hashes() FROM authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE $cron$SELECT cron.schedule('award-purge-vote-hashes', '17 3 * * *', 'SELECT public.award_purge_vote_hashes()')$cron$;
  END IF;
END $$;
