-- MuvieStars Awards, slice 2: the Audience Choice ballot and the public side of a cycle.
-- Needs 20261001000004_awards_foundation.sql.
--
-- Rules this file enforces (Awards spec v1.0, sections 10, 23, 28, 29, 51):
--   * One vote per person per category per cycle, changeable until voting closes, then locked.
--   * Only the shortlist can be voted for, only while voting is open, only in a community category.
--   * A voter's account must be old enough and they must have taken the film they vote for.
--   * Votes are written only by award_cast_vote. Nobody can read vote counts while voting runs,
--     and nobody but an awards administrator can read them at all.
-- Safe to run more than once.

-- 1. Votes ------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.award_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  nominee_id   uuid NOT NULL REFERENCES public.award_nominees(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_weight  numeric NOT NULL DEFAULT 1,
  qualified    boolean NOT NULL DEFAULT true,
  fraud_score  numeric NOT NULL DEFAULT 0,
  change_count int NOT NULL DEFAULT 0,
  -- A salted hash of the connection address, kept 90 days for fraud checks and then cleared.
  ip_hash      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_award_votes_tally ON public.award_votes (cycle_id, category_id, nominee_id);
CREATE INDEX IF NOT EXISTS idx_award_votes_ip    ON public.award_votes (created_at) WHERE ip_hash IS NOT NULL;

-- 2. Who may vote for what ----------------------------------------------------------------------------
-- Returns null when the person may vote for this nominee, otherwise the reason, written for the voter.
CREATE OR REPLACE FUNCTION public.award_vote_blocker(p_user uuid, p_nominee uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n   public.award_nominees%ROWTYPE;
  c   public.award_cycles%ROWTYPE;
  cat public.award_categories%ROWTYPE;
  v_min_age int;
  v_created timestamptz;
BEGIN
  IF p_user IS NULL THEN RETURN 'Sign in to vote.'; END IF;

  SELECT * INTO n FROM public.award_nominees WHERE id = p_nominee;
  IF NOT FOUND OR n.status <> 'approved' THEN RETURN 'That film is not on the shortlist.'; END IF;
  SELECT * INTO c   FROM public.award_cycles     WHERE id = n.cycle_id;
  SELECT * INTO cat FROM public.award_categories WHERE id = n.category_id;

  IF cat.method_type <> 'community' OR n.subject_type <> 'movie' THEN
    RETURN 'This category is not decided by a public vote.';
  END IF;
  IF c.status <> 'voting_open' THEN
    RETURN CASE WHEN c.status IN ('voting_closed', 'jury_review', 'results_locked', 'published', 'archived')
                THEN 'Voting has closed.' ELSE 'Voting has not opened yet.' END;
  END IF;
  IF now() < c.voting_start THEN RETURN 'Voting has not opened yet.'; END IF;
  IF now() >= c.voting_end THEN RETURN 'Voting has closed.'; END IF;

  v_min_age := coalesce((cat.eligibility_config ->> 'min_voter_account_age_days')::int, 7);
  SELECT created_at INTO v_created FROM auth.users WHERE id = p_user;
  IF v_created IS NULL OR v_created > now() - make_interval(days => v_min_age) THEN
    RETURN format('Your account needs to be at least %s days old to vote.', v_min_age);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.takes t WHERE t.user_id = p_user AND t.movie_id = n.subject_id) THEN
    RETURN 'Review this movie to make your vote count.';
  END IF;

  RETURN NULL;
END;
$$;

-- The one way to vote. Casting again for another film changes the vote until voting closes.
CREATE OR REPLACE FUNCTION public.award_cast_vote(p_nominee uuid, p_ip_hash text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_block text;
  n public.award_nominees%ROWTYPE;
  prev public.award_votes%ROWTYPE;
  v_id uuid;
BEGIN
  v_block := public.award_vote_blocker(v_user, p_nominee);
  IF v_block IS NOT NULL THEN
    RAISE EXCEPTION '%', v_block USING ERRCODE = '23514';
  END IF;
  SELECT * INTO n FROM public.award_nominees WHERE id = p_nominee;
  SELECT * INTO prev FROM public.award_votes WHERE user_id = v_user AND cycle_id = n.cycle_id AND category_id = n.category_id;

  IF FOUND THEN
    IF prev.nominee_id = p_nominee THEN
      RETURN jsonb_build_object('nominee_id', p_nominee, 'changed', false);
    END IF;
    IF prev.change_count >= 10 THEN
      RAISE EXCEPTION 'You have changed your vote too many times' USING ERRCODE = '23514';
    END IF;
    UPDATE public.award_votes
      SET nominee_id = p_nominee, change_count = change_count + 1, ip_hash = coalesce(p_ip_hash, ip_hash), updated_at = now()
      WHERE id = prev.id;
    PERFORM public.award_log('vote_changed', 'award_vote', prev.id,
      jsonb_build_object('nominee_id', prev.nominee_id), jsonb_build_object('nominee_id', p_nominee), NULL);
  ELSE
    INSERT INTO public.award_votes (cycle_id, category_id, nominee_id, user_id, ip_hash)
    VALUES (n.cycle_id, n.category_id, p_nominee, v_user, p_ip_hash)
    RETURNING id INTO v_id;
    PERFORM public.award_log('vote_cast', 'award_vote', v_id, NULL, jsonb_build_object('nominee_id', p_nominee), NULL);
  END IF;

  -- Connection hashes are for fraud checks only, so they do not outlive 90 days.
  UPDATE public.award_votes SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < now() - interval '90 days';

  RETURN jsonb_build_object('nominee_id', p_nominee, 'changed', prev.id IS NOT NULL);
END;
$$;

-- What the ballot page needs to know about the signed-in person: can they vote, which films have they taken,
-- and who did they pick. Shows nothing about anyone else's votes.
CREATE OR REPLACE FUNCTION public.award_ballot_status(p_cycle uuid, p_category uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  c   public.award_cycles%ROWTYPE;
  cat public.award_categories%ROWTYPE;
  v_min_age int;
  v_created timestamptz;
  v_account_ok boolean := false;
  v_from timestamptz;
  v_my uuid;
  v_noms jsonb;
BEGIN
  SELECT * INTO c   FROM public.award_cycles     WHERE id = p_cycle;
  SELECT * INTO cat FROM public.award_categories WHERE id = p_category;
  IF c.id IS NULL OR cat.id IS NULL OR c.status NOT IN ('shortlist_published', 'voting_open', 'voting_closed', 'jury_review', 'results_locked', 'published', 'archived') THEN
    RETURN NULL;
  END IF;

  v_min_age := coalesce((cat.eligibility_config ->> 'min_voter_account_age_days')::int, 7);
  IF v_user IS NOT NULL THEN
    SELECT created_at INTO v_created FROM auth.users WHERE id = v_user;
    v_account_ok := v_created IS NOT NULL AND v_created <= now() - make_interval(days => v_min_age);
    v_from := v_created + make_interval(days => v_min_age);
    SELECT nominee_id INTO v_my FROM public.award_votes WHERE user_id = v_user AND cycle_id = p_cycle AND category_id = p_category;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'nominee_id', n.id,
      'movie_id', n.subject_id,
      'taken', v_user IS NOT NULL AND EXISTS (SELECT 1 FROM public.takes t WHERE t.user_id = v_user AND t.movie_id = n.subject_id)
    ) ORDER BY n.shortlist_rank), '[]'::jsonb)
  INTO v_noms
  FROM public.award_nominees n
  WHERE n.cycle_id = p_cycle AND n.category_id = p_category AND n.status = 'approved' AND n.subject_type = 'movie';

  RETURN jsonb_build_object(
    'stage', c.status,
    'ballot', cat.method_type = 'community',
    'open', c.status = 'voting_open' AND now() >= c.voting_start AND now() < c.voting_end,
    'voting_start', c.voting_start,
    'voting_end', c.voting_end,
    'signed_in', v_user IS NOT NULL,
    'account_ok', v_account_ok,
    'account_eligible_from', CASE WHEN v_user IS NOT NULL AND NOT v_account_ok THEN v_from END,
    'min_account_age_days', v_min_age,
    'my_vote', v_my,
    'nominees', v_noms);
END;
$$;

-- For the nudge after a take: is this film inside a qualification window, or on a shortlist?
-- Shares only what the public calendar already says.
CREATE OR REPLACE FUNCTION public.award_participation_note(p_movie uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qual jsonb;
  v_short jsonb;
BEGIN
  SELECT jsonb_build_object('cycle_name', c.name, 'cycle_slug', c.slug, 'qualification_end', c.qualification_end)
  INTO v_qual
  FROM public.award_cycles c
  JOIN public.award_programs p ON p.id = c.program_id AND p.active
  WHERE c.status IN ('draft', 'qualification', 'shortlist_review')
    AND now() >= c.qualification_start AND now() < c.qualification_end
    AND EXISTS (SELECT 1 FROM public.movies m WHERE m.id = p_movie AND m.listing_status = 'approved')
  ORDER BY c.qualification_start DESC
  LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'category_name', k.name, 'category_slug', k.slug, 'cycle_name', c.name, 'cycle_slug', c.slug,
      'stage', c.status, 'ballot', k.method_type = 'community')), '[]'::jsonb)
  INTO v_short
  FROM public.award_nominees n
  JOIN public.award_cycles c ON c.id = n.cycle_id
  JOIN public.award_categories k ON k.id = n.category_id
  WHERE n.subject_type = 'movie' AND n.subject_id = p_movie AND n.status = 'approved'
    AND c.status IN ('shortlist_published', 'voting_open');

  RETURN jsonb_build_object('qualifying', v_qual, 'shortlisted', v_short);
END;
$$;

-- 3. Stages: voting opens and closes ---------------------------------------------------------------------
-- Extends the slice 1 function. Jury, results and publication stages arrive in slice 3.
CREATE OR REPLACE FUNCTION public.award_advance_cycle(p_cycle uuid, p_to text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  v_ok boolean;
  v_pending int;
  v_ready int;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND THEN RAISE EXCEPTION 'That cycle does not exist' USING ERRCODE = '23514'; END IF;

  v_ok := (c.status, p_to) IN (
    ('draft', 'qualification'), ('qualification', 'shortlist_review'), ('shortlist_review', 'qualification'),
    ('shortlist_review', 'shortlist_published'), ('shortlist_published', 'shortlist_review'),
    ('shortlist_published', 'voting_open'), ('voting_open', 'voting_closed'));
  IF NOT v_ok THEN
    RAISE EXCEPTION 'A cycle cannot go from % to %', c.status, p_to USING ERRCODE = '23514';
  END IF;

  IF p_to = 'shortlist_published' THEN
    SELECT count(*)::int INTO v_pending FROM public.award_nominees WHERE cycle_id = p_cycle AND status = 'proposed';
    IF v_pending > 0 THEN
      RAISE EXCEPTION '% proposed nominees still need approving or removing', v_pending USING ERRCODE = '23514';
    END IF;
    SELECT count(*)::int INTO v_ready FROM (
      SELECT n.category_id FROM public.award_nominees n
      JOIN public.award_categories k ON k.id = n.category_id
      WHERE n.cycle_id = p_cycle AND n.status = 'approved'
      GROUP BY n.category_id, k.min_nominees HAVING count(*) >= k.min_nominees) ok;
    IF v_ready = 0 THEN
      RAISE EXCEPTION 'No category has enough approved nominees to publish a shortlist' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_to = 'voting_open' THEN
    IF now() >= c.voting_end THEN
      RAISE EXCEPTION 'The voting window has already passed. Change the dates first' USING ERRCODE = '23514';
    END IF;
    SELECT count(*)::int INTO v_ready FROM (
      SELECT n.category_id FROM public.award_nominees n
      JOIN public.award_categories k ON k.id = n.category_id AND k.method_type = 'community'
      WHERE n.cycle_id = p_cycle AND n.status = 'approved'
      GROUP BY n.category_id, k.min_nominees HAVING count(*) >= k.min_nominees) ok;
    IF v_ready = 0 THEN
      RAISE EXCEPTION 'No community category has enough nominees to open a vote' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Pulling a published shortlist back is a public event, so it needs a reason.
  IF c.status = 'shortlist_published' AND p_to = 'shortlist_review' AND length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why the shortlist is being pulled back, in a few words' USING ERRCODE = '23514';
  END IF;

  UPDATE public.award_cycles SET status = p_to, updated_at = now() WHERE id = p_cycle;
  PERFORM public.award_log('cycle_stage_changed', 'award_cycle', p_cycle,
    jsonb_build_object('status', c.status), jsonb_build_object('status', p_to), p_reason);
END;
$$;

-- 3b. Keep scores private ----------------------------------------------------------------------------------
-- Nominee rows become publicly readable once a shortlist is published, so the system's own note must not
-- carry the qualification score (Awards spec section 12). Editor-written notes are meant to be public.
CREATE OR REPLACE FUNCTION public.award_suggest_shortlist(p_cycle uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c   public.award_cycles%ROWTYPE;
  cat public.award_categories%ROWTYPE;
  v_eligible int; v_added int;
  v_summary jsonb := '{}'::jsonb;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND OR c.status NOT IN ('qualification', 'shortlist_review') THEN
    RAISE EXCEPTION 'A shortlist can only be suggested while the cycle is being prepared' USING ERRCODE = '23514';
  END IF;

  FOR cat IN SELECT * FROM public.award_categories WHERE program_id = c.program_id AND active ORDER BY name LOOP
    SELECT count(*)::int INTO v_eligible FROM public.award_eligibility WHERE cycle_id = p_cycle AND category_id = cat.id AND eligible;
    v_added := 0;
    IF v_eligible >= cat.min_nominees THEN
      WITH ranked AS (
        SELECT e.subject_type, e.subject_id, e.qualification_score,
               row_number() OVER (ORDER BY e.qualification_score DESC NULLS LAST,
                                  coalesce((e.metadata ->> 'unique_reviewers')::int, 0) DESC, e.subject_id::text) AS rk
        FROM public.award_eligibility e
        WHERE e.cycle_id = p_cycle AND e.category_id = cat.id AND e.eligible
      ), ins AS (
        INSERT INTO public.award_nominees (cycle_id, category_id, subject_type, subject_id, shortlist_rank, status, selection_reason)
        SELECT p_cycle, cat.id, r.subject_type, r.subject_id, r.rk::int, 'proposed',
               'Suggested by the system from the month''s qualified takes'
        FROM ranked r
        WHERE r.rk <= cat.max_nominees
        ON CONFLICT (cycle_id, category_id, subject_type, subject_id) DO NOTHING
        RETURNING id
      )
      SELECT count(*)::int INTO v_added FROM ins;
    END IF;
    v_summary := v_summary || jsonb_build_object(cat.slug, jsonb_build_object(
      'eligible', v_eligible, 'suggested', v_added, 'needed', cat.min_nominees, 'enough', v_eligible >= cat.min_nominees));
  END LOOP;

  IF c.status = 'qualification' THEN
    UPDATE public.award_cycles SET status = 'shortlist_review', updated_at = now() WHERE id = p_cycle;
  END IF;
  PERFORM public.award_log('shortlist_suggested', 'award_cycle', p_cycle, NULL, v_summary, NULL);
  RETURN v_summary;
END;
$$;

UPDATE public.award_nominees
  SET selection_reason = 'Suggested by the system from the month''s qualified takes'
  WHERE selection_reason LIKE 'Suggested by the system: ranked%';

-- 4. Access ------------------------------------------------------------------------------------------------
ALTER TABLE public.award_votes ENABLE ROW LEVEL SECURITY;

-- A person can see their own vote. Only an awards administrator can see anyone else's.
-- There is no insert, update or delete policy: votes are written by award_cast_vote alone.
DROP POLICY IF EXISTS "award_votes_own_read" ON public.award_votes;
CREATE POLICY "award_votes_own_read" ON public.award_votes FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Voting functions: signed-in people vote, the read-only helpers are open to everyone, and the
-- blocker is for other functions only. Supabase grants new functions to anon and authenticated by default.
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.award_vote_blocker(uuid, uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.award_cast_vote(uuid, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.award_advance_cycle(uuid, text, text) FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.award_suggest_shortlist(uuid) FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.award_vote_blocker(uuid, uuid) FROM anon;
    REVOKE ALL ON FUNCTION public.award_cast_vote(uuid, text) FROM anon;
    REVOKE ALL ON FUNCTION public.award_advance_cycle(uuid, text, text) FROM anon;
    REVOKE ALL ON FUNCTION public.award_suggest_shortlist(uuid) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.award_vote_blocker(uuid, uuid) FROM authenticated;
  END IF;
END $$;
