-- MuvieStars Awards, slice 3a: judges, scoring, results, locking, publishing and permanent records.
-- Needs 20261001000004_awards_foundation.sql and 20261001000005_awards_voting.sql.
--
-- Rules this file enforces (Awards spec v1.0, sections 11-25, 40-53):
--   * Judges are disclosed. Their scores are private to them and to awards administrators.
--   * A judge who is recused does not score that nominee. A recusal needs a reason.
--   * Results are computed on the server from qualified activity only, then locked. A locked result
--     is never recalculated without being unlocked on the record, with a reason.
--   * A category with too little competition, too few votes, or an editor's decision is "not awarded".
--   * Raw scores are never public. The public sees outcomes, winners and the winner's story.
--   * Winners are marked, and permanent recognition records created, only when results are published.
-- Safe to run more than once.

-- 1. Judges and scores -------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.award_jurors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name         text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  bio          text CHECK (bio IS NULL OR char_length(bio) <= 600),
  organisation text CHECK (organisation IS NULL OR char_length(organisation) <= 120),
  verified     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, category_id, name)
);
CREATE UNIQUE INDEX IF NOT EXISTS award_jurors_one_account ON public.award_jurors (cycle_id, category_id, user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.award_jury_scores (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  juror_id       uuid NOT NULL REFERENCES public.award_jurors(id) ON DELETE CASCADE,
  nominee_id     uuid NOT NULL REFERENCES public.award_nominees(id) ON DELETE CASCADE,
  rubric_scores  jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score    numeric,
  notes          text CHECK (notes IS NULL OR char_length(notes) <= 1500),
  recused        boolean NOT NULL DEFAULT false,
  recusal_reason text,
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juror_id, nominee_id),
  CONSTRAINT award_jury_scores_recusal CHECK (NOT recused OR char_length(btrim(coalesce(recusal_reason, ''))) >= 10),
  CONSTRAINT award_jury_scores_total CHECK (recused OR (total_score IS NOT NULL AND total_score BETWEEN 0 AND 100))
);

-- 2. Results ----------------------------------------------------------------------------------------------
-- One row per category per cycle: how it ended, why, and (once decided) the winner's story.
CREATE TABLE IF NOT EXISTS public.award_cycle_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id       uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE CASCADE,
  category_id    uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  outcome        text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'awarded', 'not_awarded')),
  outcome_reason text,
  -- True when an editor decided "not awarded". Re-running the calculation never overrides it.
  manual         boolean NOT NULL DEFAULT false,
  story          text CHECK (story IS NULL OR char_length(story) <= 3000),
  methodology    jsonb,
  locked_at      timestamptz,
  published_at   timestamptz,
  UNIQUE (cycle_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.award_results (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id         uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE CASCADE,
  category_id      uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  nominee_id       uuid NOT NULL REFERENCES public.award_nominees(id) ON DELETE CASCADE,
  community_score  numeric,
  jury_score       numeric,
  engagement_score numeric,
  confidence_score numeric,
  final_score      numeric,
  rank             int,
  result_status    text NOT NULL DEFAULT 'ranked' CHECK (result_status IN ('ranked', 'winner', 'runner_up', 'nominee')),
  -- Every part of the score, so a result can be explained and audited. Private.
  components       jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_at        timestamptz,
  published_at     timestamptz,
  UNIQUE (cycle_id, category_id, nominee_id)
);

-- The permanent public record of an award (spec section 48).
CREATE TABLE IF NOT EXISTS public.award_recognition (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id          uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE RESTRICT,
  category_id       uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE RESTRICT,
  subject_type      text NOT NULL CHECK (subject_type IN ('movie', 'person', 'performance', 'crew')),
  subject_id        uuid NOT NULL,
  recognition_type  text NOT NULL DEFAULT 'winner' CHECK (recognition_type IN ('winner')),
  title             text NOT NULL,
  description       text,
  verification_code text NOT NULL UNIQUE,
  status            text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'under_review', 'corrected', 'revoked')),
  awarded_at        timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, category_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_award_results_cycle ON public.award_results (cycle_id, category_id, rank);
CREATE INDEX IF NOT EXISTS idx_award_recognition_subject ON public.award_recognition (subject_id);

-- Audience Choice needs a floor of votes before it can name a winner.
UPDATE public.award_categories
  SET eligibility_config = eligibility_config || '{"min_votes":10}'::jsonb
  WHERE slug = 'audience-choice' AND NOT (eligibility_config ? 'min_votes');

-- 3. Helpers --------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_cfg(p_cat public.award_categories, p_key text, p_default numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$ SELECT coalesce((p_cat.eligibility_config ->> p_key)::numeric, p_default) $$;

-- 4. Judges ---------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_add_juror(p_cycle uuid, p_category uuid, p_user uuid, p_name text, p_bio text DEFAULT NULL, p_org text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  v_id uuid;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  SELECT * INTO k FROM public.award_categories WHERE id = p_category;
  IF c.id IS NULL OR k.id IS NULL THEN RAISE EXCEPTION 'That cycle or category does not exist' USING ERRCODE = '23514'; END IF;
  IF k.method_type NOT IN ('hybrid', 'jury') THEN RAISE EXCEPTION '% has no jury', k.name USING ERRCODE = '23514'; END IF;
  IF c.status IN ('results_locked', 'published', 'archived') THEN RAISE EXCEPTION 'Judges cannot change once results are locked' USING ERRCODE = '23514'; END IF;
  IF length(btrim(coalesce(p_name, ''))) = 0 THEN RAISE EXCEPTION 'A judge needs a name. Judges are shown publicly' USING ERRCODE = '23514'; END IF;
  INSERT INTO public.award_jurors (cycle_id, category_id, user_id, name, bio, organisation)
  VALUES (p_cycle, p_category, p_user, btrim(p_name), nullif(btrim(coalesce(p_bio, '')), ''), nullif(btrim(coalesce(p_org, '')), ''))
  RETURNING id INTO v_id;
  PERFORM public.award_log('juror_added', 'award_juror', v_id, NULL, jsonb_build_object('name', btrim(p_name), 'category', k.slug), NULL);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_remove_juror(p_juror uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE j public.award_jurors%ROWTYPE; c public.award_cycles%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  IF length(btrim(coalesce(p_reason, ''))) < 10 THEN RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514'; END IF;
  SELECT * INTO j FROM public.award_jurors WHERE id = p_juror;
  IF NOT FOUND THEN RAISE EXCEPTION 'That judge does not exist' USING ERRCODE = '23514'; END IF;
  SELECT * INTO c FROM public.award_cycles WHERE id = j.cycle_id;
  IF c.status IN ('results_locked', 'published', 'archived') THEN RAISE EXCEPTION 'Judges cannot change once results are locked' USING ERRCODE = '23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.award_jury_scores WHERE juror_id = p_juror) THEN
    RAISE EXCEPTION 'This judge has already submitted scores. Recuse them from a nominee instead' USING ERRCODE = '23514';
  END IF;
  DELETE FROM public.award_jurors WHERE id = p_juror;
  PERFORM public.award_log('juror_removed', 'award_juror', p_juror, jsonb_build_object('name', j.name), NULL, p_reason);
END;
$$;

-- A judge scores one nominee on the rubric (each part 1 to 10), or recuses themselves with a reason.
CREATE OR REPLACE FUNCTION public.award_submit_jury_score(p_nominee uuid, p_rubric jsonb, p_notes text DEFAULT NULL, p_recused boolean DEFAULT false, p_recusal_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  n public.award_nominees%ROWTYPE;
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  j public.award_jurors%ROWTYPE;
  dim text;
  v_val numeric; v_w numeric; v_sum numeric := 0; v_wsum numeric := 0; v_total numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to score' USING ERRCODE = '42501'; END IF;
  SELECT * INTO n FROM public.award_nominees WHERE id = p_nominee;
  IF NOT FOUND OR n.status <> 'approved' THEN RAISE EXCEPTION 'That nominee is not on the shortlist' USING ERRCODE = '23514'; END IF;
  SELECT * INTO c FROM public.award_cycles WHERE id = n.cycle_id;
  SELECT * INTO k FROM public.award_categories WHERE id = n.category_id;
  IF c.status <> 'jury_review' THEN RAISE EXCEPTION 'Scoring is only open during jury review' USING ERRCODE = '23514'; END IF;
  SELECT * INTO j FROM public.award_jurors WHERE cycle_id = n.cycle_id AND category_id = n.category_id AND user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'You are not a judge for this category' USING ERRCODE = '42501'; END IF;

  IF p_recused THEN
    IF length(btrim(coalesce(p_recusal_reason, ''))) < 10 THEN
      RAISE EXCEPTION 'Say how you are connected to this nominee, in a few words' USING ERRCODE = '23514';
    END IF;
    INSERT INTO public.award_jury_scores (juror_id, nominee_id, rubric_scores, total_score, notes, recused, recusal_reason)
    VALUES (j.id, p_nominee, '{}'::jsonb, NULL, NULL, true, btrim(p_recusal_reason))
    ON CONFLICT (juror_id, nominee_id) DO UPDATE
      SET rubric_scores = '{}'::jsonb, total_score = NULL, notes = NULL, recused = true, recusal_reason = EXCLUDED.recusal_reason, submitted_at = now();
    PERFORM public.award_log('juror_recused', 'award_nominee', p_nominee, NULL, jsonb_build_object('juror', j.name), p_recusal_reason);
    RETURN jsonb_build_object('recused', true);
  END IF;

  FOREACH dim IN ARRAY ARRAY['story', 'direction', 'performances', 'craft', 'impact', 'cohesion'] LOOP
    BEGIN
      v_val := (p_rubric ->> dim)::numeric;
    EXCEPTION WHEN others THEN
      v_val := NULL;
    END;
    IF v_val IS NULL OR v_val < 1 OR v_val > 10 THEN
      RAISE EXCEPTION 'Score every part of the rubric from 1 to 10 (missing or out of range: %)', dim USING ERRCODE = '23514';
    END IF;
    v_w := coalesce((k.scoring_config -> 'rubric_weights' ->> dim)::numeric, 1);
    v_sum := v_sum + v_w * v_val;
    v_wsum := v_wsum + v_w;
  END LOOP;
  v_total := round(v_sum / v_wsum * 10, 2);

  INSERT INTO public.award_jury_scores (juror_id, nominee_id, rubric_scores, total_score, notes, recused, recusal_reason)
  VALUES (j.id, p_nominee, p_rubric, v_total, nullif(btrim(coalesce(p_notes, '')), ''), false, NULL)
  ON CONFLICT (juror_id, nominee_id) DO UPDATE
    SET rubric_scores = EXCLUDED.rubric_scores, total_score = EXCLUDED.total_score, notes = EXCLUDED.notes,
        recused = false, recusal_reason = NULL, submitted_at = now();
  -- The log records that a score was given, never what it was.
  PERFORM public.award_log('jury_score_submitted', 'award_nominee', p_nominee, NULL, jsonb_build_object('juror', j.name), NULL);
  RETURN jsonb_build_object('recused', false, 'total', v_total);
END;
$$;

-- 5. Fraud flags -------------------------------------------------------------------------------------------
-- Scores every vote for the signals in spec section 22 and returns the flagged ones. It only flags. A person decides.
CREATE OR REPLACE FUNCTION public.award_fraud_report(p_cycle uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flags jsonb;
BEGIN
  PERFORM public.award_require_admin();
  WITH sig AS (
    SELECT v.id, v.category_id, v.nominee_id,
      (v.ip_hash IS NOT NULL AND (SELECT count(*) FROM public.award_votes x WHERE x.cycle_id = v.cycle_id AND x.category_id = v.category_id AND x.ip_hash = v.ip_hash) >= 3) AS ip_cluster,
      (u.created_at > v.created_at - interval '14 days') AS new_account,
      (v.created_at - u.created_at < interval '10 minutes') AS instant,
      ((SELECT count(*) FROM public.takes t WHERE t.user_id = v.user_id) <= 1) AS single_title,
      EXISTS (
        SELECT 1 FROM public.takes mine
        JOIN public.award_nominees nm ON nm.id = v.nominee_id
        WHERE mine.user_id = v.user_id AND mine.movie_id = nm.subject_id AND length(coalesce(mine.quick_take, '')) >= 15
          AND (SELECT count(DISTINCT o.user_id) FROM public.takes o
               WHERE o.movie_id = mine.movie_id AND o.user_id <> mine.user_id AND lower(btrim(o.quick_take)) = lower(btrim(mine.quick_take))) >= 2
      ) AS copied_text
    FROM public.award_votes v JOIN auth.users u ON u.id = v.user_id
    WHERE v.cycle_id = p_cycle
  ), scored AS (
    SELECT s.*, least(1, (CASE WHEN ip_cluster THEN 0.35 ELSE 0 END) + (CASE WHEN new_account THEN 0.2 ELSE 0 END)
      + (CASE WHEN instant THEN 0.15 ELSE 0 END) + (CASE WHEN single_title THEN 0.15 ELSE 0 END) + (CASE WHEN copied_text THEN 0.15 ELSE 0 END)) AS score
    FROM sig s
  ), upd AS (
    UPDATE public.award_votes v SET fraud_score = s.score FROM scored s WHERE v.id = s.id RETURNING v.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'vote_id', s.id, 'category_id', s.category_id, 'nominee_id', s.nominee_id, 'score', s.score,
      'signals', to_jsonb(ARRAY_REMOVE(ARRAY[
        CASE WHEN s.ip_cluster THEN 'Shares a connection with 2 or more other votes' END,
        CASE WHEN s.new_account THEN 'Account was under 14 days old when it voted' END,
        CASE WHEN s.instant THEN 'Voted within 10 minutes of creating the account' END,
        CASE WHEN s.single_title THEN 'Has taken only one film' END,
        CASE WHEN s.copied_text THEN 'Take matches other accounts word for word' END], NULL))
    ) ORDER BY s.score DESC), '[]'::jsonb)
  INTO v_flags
  FROM scored s WHERE s.score >= 0.5;
  PERFORM public.award_log('fraud_report_run', 'award_cycle', p_cycle, NULL, jsonb_build_object('flagged', jsonb_array_length(coalesce(v_flags, '[]'::jsonb))), NULL);
  RETURN coalesce(v_flags, '[]'::jsonb);
END;
$$;

-- Invalidating a vote is a decision, not a side effect. It needs a reason, and it is kept.
CREATE OR REPLACE FUNCTION public.award_set_vote_qualified(p_vote uuid, p_qualified boolean, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.award_votes%ROWTYPE; c public.award_cycles%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  IF length(btrim(coalesce(p_reason, ''))) < 10 THEN RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514'; END IF;
  SELECT * INTO v FROM public.award_votes WHERE id = p_vote;
  IF NOT FOUND THEN RAISE EXCEPTION 'That vote does not exist' USING ERRCODE = '23514'; END IF;
  SELECT * INTO c FROM public.award_cycles WHERE id = v.cycle_id;
  IF c.status IN ('results_locked', 'published', 'archived') THEN RAISE EXCEPTION 'Votes cannot change once results are locked' USING ERRCODE = '23514'; END IF;
  UPDATE public.award_votes SET qualified = p_qualified WHERE id = p_vote;
  PERFORM public.award_log(CASE WHEN p_qualified THEN 'vote_restored' ELSE 'vote_invalidated' END, 'award_vote', p_vote,
    jsonb_build_object('qualified', v.qualified), jsonb_build_object('qualified', p_qualified), p_reason);
END;
$$;

-- 6. Scoring a nominee ---------------------------------------------------------------------------------------
-- Every component on a 0 to 100 scale, with the raw numbers they came from. Private to administrators.
CREATE OR REPLACE FUNCTION public.award_nominee_components(p_nominee uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n public.award_nominees%ROWTYPE;
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  f record;
  v_age int; v_m numeric; v_movie uuid; v_person uuid; v_person_name text; v_last text;
  v_reception numeric := 0; v_conf numeric := 0; v_quality numeric := 0; v_engage numeric := 0;
  v_total int := 0; v_text int := 0; v_watch int := 0; v_shares int := 0;
  v_conf_target numeric; v_engage_target numeric; v_picks int := 0; v_mentions int := 0;
  v_pick_full numeric; v_mention_full numeric; v_jury numeric; v_jury_n int := 0;
  v_comp jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO n FROM public.award_nominees WHERE id = p_nominee;
  SELECT * INTO c FROM public.award_cycles WHERE id = n.cycle_id;
  SELECT * INTO k FROM public.award_categories WHERE id = n.category_id;
  v_age := public.award_cfg(k, 'min_account_age_days', 7)::int;
  v_m   := public.award_cfg(k, 'bayes_m', 10);

  IF n.subject_type = 'movie' THEN v_movie := n.subject_id;
  ELSE SELECT mp.movie_id, mp.person_id INTO v_movie, v_person FROM public.movie_people mp WHERE mp.id = n.subject_id; END IF;

  SELECT * INTO f FROM public.award_film_metrics(c.id, v_age, v_m) m WHERE m.movie_id = v_movie;
  IF f.movie_id IS NOT NULL THEN
    v_reception := round(greatest(0, (f.adjusted_rating - 1) / 4 * 100), 2);
    v_conf_target := public.award_cfg(k, 'confidence_target', 3 * greatest(1, public.award_cfg(k, 'min_unique_reviewers', public.award_cfg(k, 'min_film_unique_reviewers', 10))));
    v_conf := least(100, round(f.unique_reviewers::numeric / v_conf_target * 100, 2));
  END IF;

  SELECT count(*)::int, count(*) FILTER (WHERE btrim(coalesce(t.quick_take, '')) <> '')::int INTO v_total, v_text
  FROM public.takes t JOIN auth.users u ON u.id = t.user_id
  WHERE t.movie_id = v_movie AND t.rating BETWEEN 1 AND 5
    AND t.created_at >= c.qualification_start AND t.created_at < c.qualification_end
    AND u.created_at <= t.created_at - make_interval(days => v_age);
  IF v_total > 0 THEN v_quality := round(100.0 * v_text / v_total, 2); END IF;

  SELECT count(DISTINCT w.user_id)::int INTO v_watch FROM public.watchlists w
    WHERE w.movie_id = v_movie AND w.added_at >= c.qualification_start AND w.added_at < c.qualification_end;
  SELECT count(*)::int INTO v_shares FROM public.share_visits sv JOIN public.share_cards sc ON sc.id = sv.share_card_id
    WHERE sc.movie_id = v_movie AND sv.visited_at >= c.qualification_start AND sv.visited_at < c.qualification_end
      AND sv.viewer_id IS DISTINCT FROM sc.user_id;
  v_engage_target := public.award_cfg(k, 'engagement_target', 20);
  v_engage := least(100, round((v_watch + v_shares)::numeric / v_engage_target * 100, 2));

  SELECT avg(s.total_score), count(*)::int INTO v_jury, v_jury_n
  FROM public.award_jury_scores s WHERE s.nominee_id = p_nominee AND NOT s.recused;

  IF n.subject_type = 'movie' THEN
    v_comp := jsonb_build_object('audience_reception', v_reception, 'review_confidence', v_conf, 'review_quality', v_quality,
                                 'organic_engagement', v_engage, 'jury_editorial', round(v_jury, 2));
  ELSE
    SELECT p.full_name INTO v_person_name FROM public.people p WHERE p.id = v_person;
    v_last := split_part(btrim(v_person_name), ' ', array_length(string_to_array(btrim(v_person_name), ' '), 1));
    SELECT count(DISTINCT ts.user_id)::int INTO v_picks
    FROM public.take_standouts ts
    JOIN public.takes t ON t.user_id = ts.user_id AND t.movie_id = ts.movie_id
    JOIN auth.users u ON u.id = ts.user_id
    WHERE ts.movie_id = v_movie AND ts.person_id = v_person
      AND ts.kind = CASE n.subject_type WHEN 'performance' THEN 'performance' ELSE 'direction' END
      AND t.rating BETWEEN 1 AND 5 AND t.created_at >= c.qualification_start AND t.created_at < c.qualification_end
      AND u.created_at <= t.created_at - make_interval(days => v_age);
    v_pick_full := public.award_cfg(k, 'pick_share_full_marks', 0.5);
    IF n.subject_type = 'performance' THEN
      SELECT count(*)::int INTO v_mentions
      FROM public.takes t JOIN auth.users u ON u.id = t.user_id
      WHERE t.movie_id = v_movie AND t.rating BETWEEN 1 AND 5
        AND t.created_at >= c.qualification_start AND t.created_at < c.qualification_end
        AND u.created_at <= t.created_at - make_interval(days => v_age)
        AND (position(lower(btrim(v_person_name)) IN lower(coalesce(t.quick_take, '') || ' ' || coalesce(t.full_review, ''))) > 0
             OR (length(v_last) >= 4 AND position(lower(v_last) IN lower(coalesce(t.quick_take, '') || ' ' || coalesce(t.full_review, ''))) > 0));
      v_mention_full := public.award_cfg(k, 'mention_full_marks', 0.25);
      v_comp := jsonb_build_object(
        'community_performance', CASE WHEN v_total > 0 THEN least(100, round(v_picks::numeric / v_total / v_pick_full * 100, 2)) ELSE 0 END,
        'review_text_signal',    CASE WHEN v_total > 0 THEN least(100, round(v_mentions::numeric / v_total / v_mention_full * 100, 2)) ELSE 0 END,
        'jury', round(v_jury, 2));
    ELSE
      v_comp := jsonb_build_object(
        'community_direction', CASE WHEN v_total > 0 THEN least(100, round(v_picks::numeric / v_total / v_pick_full * 100, 2)) ELSE 0 END,
        'film_reception', v_reception,
        'jury', round(v_jury, 2));
    END IF;
  END IF;

  RETURN jsonb_build_object('components', v_comp, 'jury_count', v_jury_n,
    'raw', jsonb_build_object('qualified_takes', v_total, 'unique_reviewers', coalesce(f.unique_reviewers, 0), 'adjusted_rating', f.adjusted_rating,
                              'with_text', v_text, 'watchlist_adds', v_watch, 'share_visits', v_shares, 'picks', v_picks, 'mentions', v_mentions));
END;
$$;

-- 7. Computing results ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_compute_results(p_cycle uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  cc public.award_cycle_categories%ROWTYPE;
  n record;
  v_count int; v_total_votes int; v_min_votes int; v_missing int;
  v_summary jsonb := '{}'::jsonb;
  v_comp jsonb; v_final numeric; w record; v_part numeric; v_ok boolean;
  v_top record; v_ties int;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND THEN RAISE EXCEPTION 'That cycle does not exist' USING ERRCODE = '23514'; END IF;
  IF c.status NOT IN ('voting_closed', 'jury_review') THEN
    RAISE EXCEPTION 'Results can only be calculated once voting has closed, and before they are locked' USING ERRCODE = '23514';
  END IF;

  FOR k IN SELECT * FROM public.award_categories WHERE program_id = c.program_id AND active ORDER BY name LOOP
    INSERT INTO public.award_cycle_categories (cycle_id, category_id) VALUES (p_cycle, k.id) ON CONFLICT DO NOTHING;
    SELECT * INTO cc FROM public.award_cycle_categories WHERE cycle_id = p_cycle AND category_id = k.id;
    DELETE FROM public.award_results WHERE cycle_id = p_cycle AND category_id = k.id;

    IF cc.manual THEN
      v_summary := v_summary || jsonb_build_object(k.slug, jsonb_build_object('outcome', 'not_awarded', 'reason', cc.outcome_reason, 'manual', true));
      CONTINUE;
    END IF;

    SELECT count(*)::int INTO v_count FROM public.award_nominees WHERE cycle_id = p_cycle AND category_id = k.id AND status = 'approved';
    IF v_count < k.min_nominees THEN
      UPDATE public.award_cycle_categories SET outcome = 'not_awarded',
        outcome_reason = format('Only %s %s on the shortlist, %s needed', v_count, CASE WHEN v_count = 1 THEN 'nominee' ELSE 'nominees' END, k.min_nominees)
        WHERE id = cc.id;
      v_summary := v_summary || jsonb_build_object(k.slug, jsonb_build_object('outcome', 'not_awarded', 'reason', 'Not enough competition'));
      CONTINUE;
    END IF;

    IF k.method_type = 'community' THEN
      SELECT count(*)::int INTO v_total_votes FROM public.award_votes WHERE cycle_id = p_cycle AND category_id = k.id AND qualified;
      v_min_votes := public.award_cfg(k, 'min_votes', 10)::int;
      IF v_total_votes < v_min_votes THEN
        UPDATE public.award_cycle_categories SET outcome = 'not_awarded',
          outcome_reason = format('%s qualified %s, %s needed', v_total_votes, CASE WHEN v_total_votes = 1 THEN 'vote' ELSE 'votes' END, v_min_votes)
          WHERE id = cc.id;
        v_summary := v_summary || jsonb_build_object(k.slug, jsonb_build_object('outcome', 'not_awarded', 'reason', 'Too few votes', 'votes', v_total_votes));
        CONTINUE;
      END IF;

      -- Tie-breaks (spec section 14): more qualified reviews of the film, then more voters with real history, then lower fraud risk.
      INSERT INTO public.award_results (cycle_id, category_id, nominee_id, community_score, confidence_score, final_score, rank, components)
      SELECT p_cycle, k.id, t.nominee_id, t.votes, t.reviews, t.votes, rank() OVER (ORDER BY t.votes DESC, t.reviews DESC, t.voters_with_history DESC, t.avg_fraud ASC),
             jsonb_build_object('votes', t.votes, 'qualified_reviews', t.reviews, 'voters_with_history', t.voters_with_history, 'avg_fraud', t.avg_fraud)
      FROM (
        SELECT nm.id AS nominee_id,
          (SELECT count(*) FROM public.award_votes v WHERE v.nominee_id = nm.id AND v.qualified) AS votes,
          coalesce((SELECT fm.reviews FROM public.award_film_metrics(p_cycle, public.award_cfg(k, 'min_account_age_days', 7)::int, public.award_cfg(k, 'bayes_m', 10)) fm WHERE fm.movie_id = nm.subject_id), 0) AS reviews,
          (SELECT count(*) FROM public.award_votes v WHERE v.nominee_id = nm.id AND v.qualified AND (SELECT count(*) FROM public.takes tk WHERE tk.user_id = v.user_id) >= 3) AS voters_with_history,
          coalesce((SELECT round(avg(v.fraud_score), 4) FROM public.award_votes v WHERE v.nominee_id = nm.id AND v.qualified), 0) AS avg_fraud
        FROM public.award_nominees nm WHERE nm.cycle_id = p_cycle AND nm.category_id = k.id AND nm.status = 'approved'
      ) t;
      UPDATE public.award_cycle_categories SET outcome = 'awarded', outcome_reason = NULL,
        methodology = jsonb_build_object('method', 'community', 'qualified_votes', v_total_votes) WHERE id = cc.id;
      SELECT count(*)::int INTO v_ties FROM public.award_results WHERE cycle_id = p_cycle AND category_id = k.id AND rank = 1;
      v_summary := v_summary || jsonb_build_object(k.slug, jsonb_build_object('outcome', 'awarded', 'votes', v_total_votes, 'joint', v_ties > 1));

    ELSE
      -- Hybrid and jury categories: component scores, the category's own weights, and the judges' average.
      v_missing := 0;
      FOR n IN SELECT id FROM public.award_nominees WHERE cycle_id = p_cycle AND category_id = k.id AND status = 'approved' LOOP
        v_comp := public.award_nominee_components(n.id);
        v_final := 0; v_ok := true;
        FOR w IN SELECT key, value FROM jsonb_each_text(k.scoring_config) WHERE key !~ '^rubric' LOOP
          v_part := nullif(v_comp -> 'components' ->> w.key, '')::numeric;
          IF v_part IS NULL THEN v_ok := false; ELSE v_final := v_final + w.value::numeric / 100 * v_part; END IF;
        END LOOP;
        IF NOT v_ok THEN v_missing := v_missing + 1; END IF;
        INSERT INTO public.award_results (cycle_id, category_id, nominee_id, community_score, jury_score, engagement_score, confidence_score, final_score, components)
        VALUES (p_cycle, k.id, n.id,
          coalesce(nullif(v_comp -> 'components' ->> 'audience_reception', '')::numeric, nullif(v_comp -> 'components' ->> 'community_performance', '')::numeric, nullif(v_comp -> 'components' ->> 'community_direction', '')::numeric),
          nullif(coalesce(v_comp -> 'components' ->> 'jury_editorial', v_comp -> 'components' ->> 'jury'), '')::numeric,
          nullif(v_comp -> 'components' ->> 'organic_engagement', '')::numeric,
          nullif(v_comp -> 'components' ->> 'review_confidence', '')::numeric,
          CASE WHEN v_ok THEN round(v_final, 3) END, v_comp);
      END LOOP;

      IF v_missing > 0 THEN
        -- Judges have not finished. Nothing is ranked, and the category stays pending.
        UPDATE public.award_cycle_categories SET outcome = 'pending', outcome_reason = format('Waiting for jury scores on %s %s', v_missing, CASE WHEN v_missing = 1 THEN 'nominee' ELSE 'nominees' END) WHERE id = cc.id;
        v_summary := v_summary || jsonb_build_object(k.slug, jsonb_build_object('outcome', 'pending', 'reason', 'Waiting for jury scores', 'missing', v_missing));
      ELSE
        UPDATE public.award_results r SET rank = x.rk
        FROM (SELECT id, rank() OVER (ORDER BY final_score DESC, jury_score DESC NULLS LAST) AS rk
              FROM public.award_results WHERE cycle_id = p_cycle AND category_id = k.id) x
        WHERE r.id = x.id;
        UPDATE public.award_cycle_categories SET outcome = 'awarded', outcome_reason = NULL,
          methodology = jsonb_build_object('method', k.method_type, 'weights', k.scoring_config) WHERE id = cc.id;
        SELECT count(*)::int INTO v_ties FROM public.award_results WHERE cycle_id = p_cycle AND category_id = k.id AND rank = 1;
        v_summary := v_summary || jsonb_build_object(k.slug, jsonb_build_object('outcome', 'awarded', 'joint', v_ties > 1));
      END IF;
    END IF;
  END LOOP;

  PERFORM public.award_log('results_computed', 'award_cycle', p_cycle, NULL, v_summary, NULL);
  RETURN v_summary;
END;
$$;

-- "Categories can remain unawarded": an editor can decide a category is not awarded, with a reason.
CREATE OR REPLACE FUNCTION public.award_set_category_outcome(p_cycle uuid, p_category uuid, p_outcome text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.award_cycles%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND OR c.status NOT IN ('voting_closed', 'jury_review') THEN
    RAISE EXCEPTION 'An outcome can only be set between voting closing and results locking' USING ERRCODE = '23514';
  END IF;
  IF p_outcome NOT IN ('not_awarded', 'pending') THEN RAISE EXCEPTION 'Pick not awarded, or put it back to pending' USING ERRCODE = '23514'; END IF;
  IF p_outcome = 'not_awarded' AND length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why this category is not being awarded, in a few words. The reason is kept in the record' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.award_cycle_categories (cycle_id, category_id) VALUES (p_cycle, p_category) ON CONFLICT DO NOTHING;
  UPDATE public.award_cycle_categories
    SET outcome = p_outcome, manual = (p_outcome = 'not_awarded'),
        outcome_reason = CASE WHEN p_outcome = 'not_awarded' THEN 'Editors decided no award would be issued' ELSE NULL END
    WHERE cycle_id = p_cycle AND category_id = p_category;
  PERFORM public.award_log('category_outcome_set', 'award_cycle', p_cycle, NULL, jsonb_build_object('category_id', p_category, 'outcome', p_outcome), p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_set_story(p_cycle uuid, p_category uuid, p_story text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.award_cycles%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND OR c.status NOT IN ('jury_review', 'results_locked') THEN
    RAISE EXCEPTION 'A winner''s story can be written during jury review or once results are locked' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.award_cycle_categories (cycle_id, category_id) VALUES (p_cycle, p_category) ON CONFLICT DO NOTHING;
  UPDATE public.award_cycle_categories SET story = nullif(btrim(coalesce(p_story, '')), '') WHERE cycle_id = p_cycle AND category_id = p_category;
  PERFORM public.award_log('story_written', 'award_cycle', p_cycle, NULL, jsonb_build_object('category_id', p_category), NULL);
END;
$$;

-- 8. Locking and publishing ----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_lock_results(p_cycle uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  v_open int;
  v_now timestamptz := now();
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND OR c.status <> 'jury_review' THEN
    RAISE EXCEPTION 'Results can only be locked during jury review' USING ERRCODE = '23514';
  END IF;
  SELECT count(*)::int INTO v_open FROM public.award_categories k
    LEFT JOIN public.award_cycle_categories cc ON cc.category_id = k.id AND cc.cycle_id = p_cycle
    WHERE k.program_id = c.program_id AND k.active AND coalesce(cc.outcome, 'pending') = 'pending';
  IF v_open > 0 THEN
    RAISE EXCEPTION '% % still have no outcome. Calculate the results first, and finish any jury scoring', v_open, CASE WHEN v_open = 1 THEN 'category' ELSE 'categories' END USING ERRCODE = '23514';
  END IF;

  UPDATE public.award_results r SET result_status = CASE WHEN r.rank = 1 THEN 'winner' WHEN r.rank = 2 THEN 'runner_up' ELSE 'nominee' END, locked_at = v_now
    FROM public.award_cycle_categories cc
    WHERE r.cycle_id = p_cycle AND cc.cycle_id = p_cycle AND cc.category_id = r.category_id AND cc.outcome = 'awarded';
  UPDATE public.award_results r SET locked_at = v_now
    FROM public.award_cycle_categories cc
    WHERE r.cycle_id = p_cycle AND cc.cycle_id = p_cycle AND cc.category_id = r.category_id AND cc.outcome <> 'awarded';
  UPDATE public.award_cycle_categories SET locked_at = v_now WHERE cycle_id = p_cycle;
  UPDATE public.award_cycles SET status = 'results_locked', updated_at = v_now WHERE id = p_cycle;
  PERFORM public.award_log('results_locked', 'award_cycle', p_cycle, jsonb_build_object('status', c.status), jsonb_build_object('status', 'results_locked'), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_publish_results(p_cycle uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  cc public.award_cycle_categories%ROWTYPE;
  w record;
  v_now timestamptz := now();
  v_code text; v_tries int; v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; v_initials text;
  v_published int := 0;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND OR c.status <> 'results_locked' THEN
    RAISE EXCEPTION 'Results can only be published once they are locked' USING ERRCODE = '23514';
  END IF;

  -- Every award that is given needs its story: why it won, in the editors' words.
  FOR cc IN SELECT * FROM public.award_cycle_categories WHERE cycle_id = p_cycle AND outcome = 'awarded' LOOP
    IF length(btrim(coalesce(cc.story, ''))) < 80 THEN
      SELECT * INTO k FROM public.award_categories WHERE id = cc.category_id;
      RAISE EXCEPTION '% needs its winner''s story (at least 80 characters) before it can be published', k.name USING ERRCODE = '23514';
    END IF;
  END LOOP;

  FOR cc IN SELECT * FROM public.award_cycle_categories WHERE cycle_id = p_cycle AND outcome = 'awarded' LOOP
    SELECT * INTO k FROM public.award_categories WHERE id = cc.category_id;
    SELECT string_agg(upper(left(part, 1)), '') INTO v_initials FROM unnest(string_to_array(k.slug, '-')) AS part;
    FOR w IN SELECT r.*, n.subject_type, n.subject_id AS subj FROM public.award_results r JOIN public.award_nominees n ON n.id = r.nominee_id
             WHERE r.cycle_id = p_cycle AND r.category_id = k.id AND r.rank = 1 LOOP
      v_tries := 0;
      LOOP
        v_code := 'MS-' || c.slug || '-' || v_initials || '-' || (
          SELECT string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '') FROM generate_series(1, 5));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.award_recognition WHERE verification_code = v_code);
        v_tries := v_tries + 1;
        IF v_tries > 20 THEN RAISE EXCEPTION 'Could not make a unique verification code'; END IF;
      END LOOP;
      INSERT INTO public.award_recognition (cycle_id, category_id, subject_type, subject_id, recognition_type, title, description, verification_code, status, awarded_at)
      VALUES (p_cycle, k.id, w.subject_type, w.subj, 'winner', k.name || ', ' || c.name, cc.story, v_code, 'valid', v_now);
      UPDATE public.award_nominees SET status = 'winner' WHERE id = w.nominee_id;
      v_published := v_published + 1;
    END LOOP;
    UPDATE public.award_nominees SET status = 'runner_up'
      WHERE id IN (SELECT nominee_id FROM public.award_results WHERE cycle_id = p_cycle AND category_id = k.id AND rank = 2);
  END LOOP;

  UPDATE public.award_results SET published_at = v_now WHERE cycle_id = p_cycle;
  UPDATE public.award_cycle_categories SET published_at = v_now WHERE cycle_id = p_cycle;
  UPDATE public.award_cycles SET status = 'published', published_at = v_now, updated_at = v_now WHERE id = p_cycle;
  PERFORM public.award_log('results_published', 'award_cycle', p_cycle, jsonb_build_object('status', 'results_locked'), jsonb_build_object('status', 'published', 'winners', v_published), NULL);
  RETURN jsonb_build_object('winners', v_published);
END;
$$;

-- 9. Stages, final shape for this slice -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_advance_cycle(p_cycle uuid, p_to text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  v_ok boolean;
  v_pending int;
  v_ready int;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND THEN RAISE EXCEPTION 'That cycle does not exist' USING ERRCODE = '23514'; END IF;

  -- Locking and publishing have their own functions (award_lock_results, award_publish_results).
  v_ok := (c.status, p_to) IN (
    ('draft', 'qualification'), ('qualification', 'shortlist_review'), ('shortlist_review', 'qualification'),
    ('shortlist_review', 'shortlist_published'), ('shortlist_published', 'shortlist_review'),
    ('shortlist_published', 'voting_open'), ('voting_open', 'voting_closed'),
    ('voting_closed', 'jury_review'), ('results_locked', 'jury_review'), ('published', 'archived'));
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
      JOIN public.award_categories kk ON kk.id = n.category_id
      WHERE n.cycle_id = p_cycle AND n.status = 'approved'
      GROUP BY n.category_id, kk.min_nominees HAVING count(*) >= kk.min_nominees) ok;
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
      JOIN public.award_categories kk ON kk.id = n.category_id AND kk.method_type = 'community'
      WHERE n.cycle_id = p_cycle AND n.status = 'approved'
      GROUP BY n.category_id, kk.min_nominees HAVING count(*) >= kk.min_nominees) ok;
    IF v_ready = 0 THEN
      RAISE EXCEPTION 'No community category has enough nominees to open a vote' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Every category that needs judges must have one before jury review starts.
  IF p_to = 'jury_review' AND c.status = 'voting_closed' THEN
    FOR k IN SELECT kk.* FROM public.award_categories kk
             WHERE kk.program_id = c.program_id AND kk.active AND kk.method_type IN ('hybrid', 'jury')
               AND (SELECT count(*) FROM public.award_nominees n WHERE n.cycle_id = p_cycle AND n.category_id = kk.id AND n.status = 'approved') >= kk.min_nominees
               AND NOT EXISTS (SELECT 1 FROM public.award_jurors j WHERE j.cycle_id = p_cycle AND j.category_id = kk.id) LOOP
      RAISE EXCEPTION 'Add at least one judge for % before jury review starts', k.name USING ERRCODE = '23514';
    END LOOP;
  END IF;

  -- Unlocking results is a public event on the record.
  IF (c.status = 'shortlist_published' AND p_to = 'shortlist_review') OR (c.status = 'results_locked' AND p_to = 'jury_review') THEN
    IF length(btrim(coalesce(p_reason, ''))) < 10 THEN
      RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF c.status = 'results_locked' AND p_to = 'jury_review' THEN
    UPDATE public.award_results SET locked_at = NULL, result_status = 'ranked' WHERE cycle_id = p_cycle;
    UPDATE public.award_cycle_categories SET locked_at = NULL WHERE cycle_id = p_cycle;
  END IF;

  UPDATE public.award_cycles SET status = p_to, updated_at = now() WHERE id = p_cycle;
  PERFORM public.award_log('cycle_stage_changed', 'award_cycle', p_cycle,
    jsonb_build_object('status', c.status), jsonb_build_object('status', p_to), p_reason);
END;
$$;

-- 10. Access ------------------------------------------------------------------------------------------------------
ALTER TABLE public.award_jurors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_jury_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_cycle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_recognition      ENABLE ROW LEVEL SECURITY;

-- Judges are disclosed publicly (spec section 3) once a cycle is public. A judge also always sees their own entry.
DROP POLICY IF EXISTS "award_jurors_read" ON public.award_jurors;
CREATE POLICY "award_jurors_read" ON public.award_jurors FOR SELECT USING (
  public.is_admin() OR auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.award_cycles c WHERE c.id = cycle_id
             AND c.status IN ('shortlist_published', 'voting_open', 'voting_closed', 'jury_review', 'results_locked', 'published', 'archived')));

-- Scores are private: the judge who gave them, and awards administrators.
DROP POLICY IF EXISTS "award_jury_scores_read" ON public.award_jury_scores;
CREATE POLICY "award_jury_scores_read" ON public.award_jury_scores FOR SELECT USING (
  public.is_admin() OR EXISTS (SELECT 1 FROM public.award_jurors j WHERE j.id = juror_id AND j.user_id = auth.uid()));

-- Raw results never leave administrators. The public sees the outcome and the winner's story only.
DROP POLICY IF EXISTS "award_results_admin" ON public.award_results;
CREATE POLICY "award_results_admin" ON public.award_results FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "award_cycle_categories_read" ON public.award_cycle_categories;
CREATE POLICY "award_cycle_categories_read" ON public.award_cycle_categories FOR SELECT USING (
  public.is_admin() OR (published_at IS NOT NULL AND EXISTS (SELECT 1 FROM public.award_cycles c WHERE c.id = cycle_id AND c.status IN ('published', 'archived'))));

-- The permanent record is public, whatever its status, so a corrected or revoked laurel can explain itself.
DROP POLICY IF EXISTS "award_recognition_read" ON public.award_recognition;
CREATE POLICY "award_recognition_read" ON public.award_recognition FOR SELECT USING (true);

DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'award_add_juror(uuid,uuid,uuid,text,text,text)', 'award_remove_juror(uuid,text)',
    'award_fraud_report(uuid)', 'award_set_vote_qualified(uuid,boolean,text)', 'award_nominee_components(uuid)',
    'award_compute_results(uuid)', 'award_set_category_outcome(uuid,uuid,text,text)', 'award_set_story(uuid,uuid,text)',
    'award_lock_results(uuid)', 'award_publish_results(uuid)', 'award_advance_cycle(uuid,text,text)',
    'award_submit_jury_score(uuid,jsonb,text,boolean,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', f);
    END IF;
  END LOOP;
  -- The scoring internals are for the other functions only.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_nominee_components(uuid) FROM authenticated';
  END IF;
END $$;
