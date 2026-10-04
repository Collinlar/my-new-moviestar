-- MuvieStars Awards & Recognition, slice 1: foundation.
-- Programmes, categories, monthly cycles, eligibility, shortlists and the audit log, plus the
-- "which performance / which direction stood out" picks that the person awards depend on.
-- Later slices add voting, jury scoring, results, recognition records and laurels.
--
-- Rules this file enforces (Awards spec v1.0):
--   * Nothing here is writable from the browser. Admin actions go through the award_* functions,
--     which check is_admin() and write the audit log. The audit log cannot be edited or deleted.
--   * Eligibility is computed from qualified takes only (see award_film_metrics).
--   * Sponsorship has no column anywhere in these tables.
-- Safe to run more than once. Needs 20260930000003_unified_takes_and_share_cards.sql (the takes view).

-- 1. Programmes, categories, cycles ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.award_programs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  program_type text NOT NULL CHECK (program_type IN ('monthly', 'quarterly', 'annual', 'canon', 'selection')),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.award_categories (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id         uuid NOT NULL REFERENCES public.award_programs(id) ON DELETE CASCADE,
  name               text NOT NULL,
  slug               text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- movie: a film. performance: an actor in a film (subject_id is the movie_people credit).
  -- crew: a crew member on a film (the movie_people credit). person: a person with no film attached.
  subject_type       text NOT NULL CHECK (subject_type IN ('movie', 'person', 'performance', 'crew')),
  method_type        text NOT NULL CHECK (method_type IN ('community', 'hybrid', 'jury', 'editorial')),
  description        text,
  min_nominees       int  NOT NULL DEFAULT 3 CHECK (min_nominees >= 1),
  max_nominees       int  NOT NULL DEFAULT 6 CHECK (max_nominees >= 1),
  eligibility_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring_config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, slug),
  CONSTRAINT award_categories_nominee_range CHECK (max_nominees >= min_nominees)
);

CREATE TABLE IF NOT EXISTS public.award_cycles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id          uuid NOT NULL REFERENCES public.award_programs(id) ON DELETE RESTRICT,
  name                text NOT NULL,
  slug                text NOT NULL CHECK (slug ~ '^[0-9]{4}-[0-9]{2}$'),
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  qualification_start timestamptz NOT NULL,
  qualification_end   timestamptz NOT NULL,
  voting_start        timestamptz NOT NULL,
  voting_end          timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'qualification', 'shortlist_review', 'shortlist_published', 'voting_open',
    'voting_closed', 'jury_review', 'results_locked', 'published', 'archived')),
  published_at        timestamptz,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, slug),
  CONSTRAINT award_cycles_dates_in_order CHECK (
    period_start <= period_end
    AND qualification_start < qualification_end
    AND qualification_end <= voting_start
    AND voting_start < voting_end)
);

-- 2. Eligibility, shortlist, audit ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.award_eligibility (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id                uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE CASCADE,
  category_id             uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  subject_type            text NOT NULL CHECK (subject_type IN ('movie', 'person', 'performance', 'crew')),
  subject_id              uuid NOT NULL,
  eligible                boolean NOT NULL,
  qualification_score     numeric,
  disqualification_reason text,
  metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- An editor's decision. Re-running qualification never changes a row that has an override.
  override                boolean NOT NULL DEFAULT false,
  evaluated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, category_id, subject_type, subject_id)
);

CREATE TABLE IF NOT EXISTS public.award_nominees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id         uuid NOT NULL REFERENCES public.award_cycles(id) ON DELETE CASCADE,
  category_id      uuid NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  subject_type     text NOT NULL CHECK (subject_type IN ('movie', 'person', 'performance', 'crew')),
  subject_id       uuid NOT NULL,
  shortlist_rank   int,
  status           text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'withdrawn', 'disqualified', 'winner', 'runner_up')),
  selection_reason text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, category_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_award_eligibility_cycle ON public.award_eligibility (cycle_id, category_id, eligible, qualification_score DESC);
CREATE INDEX IF NOT EXISTS idx_award_nominees_cycle    ON public.award_nominees (cycle_id, category_id, status);

CREATE TABLE IF NOT EXISTS public.award_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     uuid,
  before_state  jsonb,
  after_state   jsonb,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_award_audit_entity ON public.award_audit_log (entity_type, entity_id, created_at DESC);

-- The audit log is a record, not a working table.
CREATE OR REPLACE FUNCTION public.award_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'The awards audit log cannot be changed or deleted' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS award_audit_immutable ON public.award_audit_log;
CREATE TRIGGER award_audit_immutable
  BEFORE UPDATE OR DELETE ON public.award_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.award_audit_immutable();

-- 3. Standout picks: "Which performance stood out?" / "Was the direction a standout?" ----------------
-- One pick of each kind per person per film, and only from someone who has taken the film.
CREATE TABLE IF NOT EXISTS public.take_standouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id   uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('performance', 'direction')),
  person_id  uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_take_standouts_movie ON public.take_standouts (movie_id, kind, person_id);

CREATE OR REPLACE FUNCTION public.take_standouts_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.movie_reactions r WHERE r.user_id = NEW.user_id AND r.movie_id = NEW.movie_id AND r.status = 'published') THEN
    RAISE EXCEPTION 'Take the film before saying what stood out' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.movie_people mp
    WHERE mp.movie_id = NEW.movie_id AND mp.person_id = NEW.person_id
      AND mp.role = CASE NEW.kind WHEN 'performance' THEN 'actor' ELSE 'director' END
  ) THEN
    RAISE EXCEPTION 'That person is not credited that way on this film' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS take_standouts_guard ON public.take_standouts;
CREATE TRIGGER take_standouts_guard
  BEFORE INSERT OR UPDATE ON public.take_standouts
  FOR EACH ROW EXECUTE FUNCTION public.take_standouts_guard();

-- 4. Launch programme and categories --------------------------------------------------------------
INSERT INTO public.award_programs (name, slug, description, program_type)
VALUES ('MuvieStars Monthly Honours', 'monthly-honours',
        'Four recurring honours: Movie of the Month, Performance of the Month, Director of the Month and Audience Choice.', 'monthly')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.award_categories (program_id, name, slug, subject_type, method_type, description, min_nominees, max_nominees, eligibility_config, scoring_config)
SELECT p.id, v.name, v.slug, v.subject_type, v.method_type, v.description, v.min_nominees, v.max_nominees, v.eligibility::jsonb, v.scoring::jsonb
FROM public.award_programs p
CROSS JOIN (VALUES
  ('Movie of the Month', 'movie-of-the-month', 'movie', 'hybrid',
   'The film that made the strongest case this month. Part audience reception, part editorial and jury judgement.', 3, 6,
   '{"min_unique_reviewers":10,"min_qualified_reviews":10,"min_seen_confirmations":0,"min_listing_age_days":14,"min_account_age_days":7,"bayes_m":10}',
   '{"audience_reception":30,"review_confidence":20,"review_quality":10,"organic_engagement":10,"jury_editorial":30}'),
  ('Performance of the Month', 'performance-of-the-month', 'performance', 'hybrid',
   'An acting performance the audience singled out, weighed by the jury.', 3, 5,
   '{"min_film_unique_reviewers":10,"min_standout_picks":3,"min_listing_age_days":14,"min_account_age_days":7}',
   '{"community_performance":40,"review_text_signal":20,"jury":40}'),
  ('Director of the Month', 'director-of-the-month', 'crew', 'hybrid',
   'Direction the audience called out, weighed most heavily by the jury.', 3, 5,
   '{"min_film_unique_reviewers":10,"min_standout_picks":3,"min_listing_age_days":14,"min_account_age_days":7}',
   '{"community_direction":30,"film_reception":20,"jury":50}'),
  ('Audience Choice', 'audience-choice', 'movie', 'community',
   'Decided entirely by qualified votes from the audience, after an editor-reviewed shortlist.', 3, 6,
   '{"min_unique_reviewers":10,"min_qualified_reviews":10,"min_seen_confirmations":0,"min_listing_age_days":14,"min_account_age_days":7,"bayes_m":10,"min_voter_account_age_days":7}',
   '{"community_vote":100}')
) AS v(name, slug, subject_type, method_type, description, min_nominees, max_nominees, eligibility, scoring)
WHERE p.slug = 'monthly-honours'
ON CONFLICT (program_id, slug) DO NOTHING;

-- 5. Internals ------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_require_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only awards administrators can do that' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_log(p_action text, p_entity_type text, p_entity_id uuid, p_before jsonb, p_after jsonb, p_reason text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.award_audit_log (actor_user_id, action, entity_type, entity_id, before_state, after_state, reason)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after, nullif(btrim(p_reason), ''));
$$;

-- A qualified take (spec section 9): a valid star rating, saved inside the qualification window by an
-- account that was already old enough, on a film. One take per person per film is enforced upstream.
-- Returns one row per film that has at least one qualified take.
CREATE OR REPLACE FUNCTION public.award_film_metrics(p_cycle uuid, p_min_account_age_days int, p_bayes_m numeric)
RETURNS TABLE (
  movie_id uuid, listing_status text, listed_days int,
  reviews int, unique_reviewers int, avg_rating numeric, adjusted_rating numeric, seen_confirmations int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH win AS (
    SELECT qualification_start AS qs, qualification_end AS qe FROM public.award_cycles WHERE id = p_cycle
  ),
  q AS (
    SELECT t.movie_id, t.user_id, t.rating::numeric AS rating
    FROM public.takes t
    JOIN auth.users u ON u.id = t.user_id
    CROSS JOIN win
    WHERE t.rating BETWEEN 1 AND 5
      AND t.created_at >= win.qs AND t.created_at < win.qe
      AND u.created_at <= t.created_at - make_interval(days => p_min_account_age_days)
  ),
  platform AS (
    SELECT coalesce(avg(q.rating), 3.0) AS c
    FROM q JOIN public.movies m ON m.id = q.movie_id
    WHERE m.listing_status = 'approved'
  ),
  per AS (
    SELECT q.movie_id, count(*)::int AS reviews, count(DISTINCT q.user_id)::int AS uniq, avg(q.rating) AS r
    FROM q GROUP BY q.movie_id
  )
  SELECT
    per.movie_id,
    m.listing_status,
    greatest(0, floor(extract(epoch FROM (win.qe - coalesce(
      (SELECT max(lr.created_at) FROM public.movie_listing_reviews lr WHERE lr.movie_id = m.id AND lr.to_status = 'approved'),
      m.created_at)) ) / 86400))::int,
    per.reviews,
    per.uniq,
    round(per.r, 3),
    -- Bayesian adjustment (spec section 20): a handful of 5-star takes cannot beat many strong ones.
    round((per.uniq::numeric / (per.uniq + p_bayes_m)) * per.r + (p_bayes_m / (per.uniq + p_bayes_m)) * platform.c, 3),
    (SELECT count(DISTINCT i.user_id)::int FROM public.movie_interactions i
      WHERE i.movie_id = per.movie_id AND i.interaction_type = 'seen' AND i.created_at >= win.qs AND i.created_at < win.qe)
  FROM per
  JOIN public.movies m ON m.id = per.movie_id
  CROSS JOIN win
  CROSS JOIN platform;
$$;

-- 6. Cycle management ---------------------------------------------------------------------------------
-- Creates the monthly cycle with the spec's calendar: days 1-20 qualification, day 21 shortlist,
-- days 21-27 voting, closing at the start of day 28. Dates can be edited while the cycle is still being set up.
CREATE OR REPLACE FUNCTION public.award_create_cycle(p_program uuid, p_month date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date := date_trunc('month', p_month)::date;
  v_id uuid;
BEGIN
  PERFORM public.award_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.award_programs WHERE id = p_program AND active) THEN
    RAISE EXCEPTION 'That programme is not active' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.award_cycles (program_id, name, slug, period_start, period_end, qualification_start, qualification_end, voting_start, voting_end, created_by)
  VALUES (
    p_program, to_char(v_start, 'FMMonth YYYY'), to_char(v_start, 'YYYY-MM'),
    v_start, (v_start + interval '1 month' - interval '1 day')::date,
    v_start::timestamp AT TIME ZONE 'UTC',
    (v_start + 20)::timestamp AT TIME ZONE 'UTC',
    (v_start + 20)::timestamp AT TIME ZONE 'UTC',
    (v_start + 27)::timestamp AT TIME ZONE 'UTC',
    auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.award_log('cycle_created', 'award_cycle', v_id, NULL, jsonb_build_object('slug', to_char(v_start, 'YYYY-MM')), NULL);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_update_cycle_dates(p_cycle uuid, p_qs timestamptz, p_qe timestamptz, p_vs timestamptz, p_ve timestamptz, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.award_cycles%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND THEN RAISE EXCEPTION 'That cycle does not exist' USING ERRCODE = '23514'; END IF;
  IF c.status NOT IN ('draft', 'qualification', 'shortlist_review') THEN
    RAISE EXCEPTION 'Dates can only change before the shortlist is published' USING ERRCODE = '23514';
  END IF;
  IF length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why the dates are changing, in a few words' USING ERRCODE = '23514';
  END IF;
  UPDATE public.award_cycles
    SET qualification_start = p_qs, qualification_end = p_qe, voting_start = p_vs, voting_end = p_ve, updated_at = now()
    WHERE id = p_cycle;
  PERFORM public.award_log('cycle_dates_changed', 'award_cycle', p_cycle,
    jsonb_build_object('qualification_start', c.qualification_start, 'qualification_end', c.qualification_end, 'voting_start', c.voting_start, 'voting_end', c.voting_end),
    jsonb_build_object('qualification_start', p_qs, 'qualification_end', p_qe, 'voting_start', p_vs, 'voting_end', p_ve), p_reason);
END;
$$;

-- 7. Qualification -----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_run_qualification(p_cycle uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c   public.award_cycles%ROWTYPE;
  cat public.award_categories%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_summary jsonb := '{}'::jsonb;
  v_age int; v_m numeric; v_min_reviews int; v_min_unique int; v_min_seen int; v_min_listing int;
  v_film_unique int; v_picks int; v_candidates int; v_eligible int;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND THEN RAISE EXCEPTION 'That cycle does not exist' USING ERRCODE = '23514'; END IF;
  IF c.status NOT IN ('draft', 'qualification', 'shortlist_review') THEN
    RAISE EXCEPTION 'Qualification can only be run before the shortlist is published' USING ERRCODE = '23514';
  END IF;
  IF c.status = 'draft' THEN
    UPDATE public.award_cycles SET status = 'qualification', updated_at = now() WHERE id = p_cycle;
  END IF;

  FOR cat IN SELECT * FROM public.award_categories WHERE program_id = c.program_id AND active ORDER BY name LOOP
    v_age          := coalesce((cat.eligibility_config ->> 'min_account_age_days')::int, 7);
    v_m            := coalesce((cat.eligibility_config ->> 'bayes_m')::numeric, 10);
    v_min_reviews  := coalesce((cat.eligibility_config ->> 'min_qualified_reviews')::int, 0);
    v_min_unique   := coalesce((cat.eligibility_config ->> 'min_unique_reviewers')::int, 0);
    v_min_seen     := coalesce((cat.eligibility_config ->> 'min_seen_confirmations')::int, 0);
    v_min_listing  := coalesce((cat.eligibility_config ->> 'min_listing_age_days')::int, 0);
    v_film_unique  := coalesce((cat.eligibility_config ->> 'min_film_unique_reviewers')::int, v_min_unique);
    v_picks        := coalesce((cat.eligibility_config ->> 'min_standout_picks')::int, 1);

    IF cat.subject_type = 'movie' THEN
      INSERT INTO public.award_eligibility (cycle_id, category_id, subject_type, subject_id, eligible, qualification_score, disqualification_reason, metadata, evaluated_at)
      SELECT p_cycle, cat.id, 'movie', f.movie_id, r.reason IS NULL, f.adjusted_rating, r.reason,
             jsonb_build_object('reviews', f.reviews, 'unique_reviewers', f.unique_reviewers, 'avg_rating', f.avg_rating,
                                'adjusted_rating', f.adjusted_rating, 'seen_confirmations', f.seen_confirmations, 'listed_days', f.listed_days),
             v_now
      FROM public.award_film_metrics(p_cycle, v_age, v_m) f
      CROSS JOIN LATERAL (SELECT CASE
        WHEN f.listing_status <> 'approved' THEN 'Not listed on MuvieStars'
        WHEN f.listed_days < v_min_listing THEN format('Listed %s days before the window closed, %s needed', f.listed_days, v_min_listing)
        WHEN f.reviews < v_min_reviews THEN format('%s qualified reviews, %s needed', f.reviews, v_min_reviews)
        WHEN f.unique_reviewers < v_min_unique THEN format('%s different reviewers, %s needed', f.unique_reviewers, v_min_unique)
        WHEN f.seen_confirmations < v_min_seen THEN format('%s Seen confirmations, %s needed', f.seen_confirmations, v_min_seen)
      END AS reason) r
      ON CONFLICT (cycle_id, category_id, subject_type, subject_id) DO UPDATE
        SET eligible = EXCLUDED.eligible, qualification_score = EXCLUDED.qualification_score,
            disqualification_reason = EXCLUDED.disqualification_reason, metadata = EXCLUDED.metadata, evaluated_at = EXCLUDED.evaluated_at
        WHERE public.award_eligibility.override = false;

    ELSIF cat.subject_type IN ('performance', 'crew') THEN
      INSERT INTO public.award_eligibility (cycle_id, category_id, subject_type, subject_id, eligible, qualification_score, disqualification_reason, metadata, evaluated_at)
      SELECT p_cycle, cat.id, cat.subject_type, pk.credit_id, r.reason IS NULL,
             round(pk.picks::numeric / nullif(f.unique_reviewers, 0), 4), r.reason,
             jsonb_build_object('movie_id', pk.movie_id, 'person_id', pk.person_id, 'picks', pk.picks,
                                'unique_reviewers', f.unique_reviewers, 'reviews', f.reviews, 'listed_days', f.listed_days),
             v_now
      FROM (
        SELECT cr.id AS credit_id, cr.movie_id, cr.person_id, count(DISTINCT ts.user_id)::int AS picks
        FROM public.take_standouts ts
        JOIN (
          SELECT DISTINCT ON (mp.movie_id, mp.person_id, mp.role) mp.id, mp.movie_id, mp.person_id, mp.role
          FROM public.movie_people mp
          ORDER BY mp.movie_id, mp.person_id, mp.role, mp.id::text
        ) cr ON cr.movie_id = ts.movie_id AND cr.person_id = ts.person_id
             AND cr.role = CASE ts.kind WHEN 'performance' THEN 'actor' ELSE 'director' END
        JOIN public.takes t ON t.user_id = ts.user_id AND t.movie_id = ts.movie_id
        JOIN auth.users u ON u.id = ts.user_id
        WHERE ts.kind = CASE cat.subject_type WHEN 'performance' THEN 'performance' ELSE 'direction' END
          AND t.rating BETWEEN 1 AND 5
          AND t.created_at >= c.qualification_start AND t.created_at < c.qualification_end
          AND u.created_at <= t.created_at - make_interval(days => v_age)
        GROUP BY cr.id, cr.movie_id, cr.person_id
      ) pk
      JOIN public.award_film_metrics(p_cycle, v_age, v_m) f ON f.movie_id = pk.movie_id
      CROSS JOIN LATERAL (SELECT CASE
        WHEN f.listing_status <> 'approved' THEN 'Film is not listed on MuvieStars'
        WHEN f.listed_days < v_min_listing THEN format('Film listed %s days before the window closed, %s needed', f.listed_days, v_min_listing)
        WHEN f.unique_reviewers < v_film_unique THEN format('Film has %s different reviewers, %s needed', f.unique_reviewers, v_film_unique)
        WHEN pk.picks < v_picks THEN format('%s standout picks, %s needed', pk.picks, v_picks)
      END AS reason) r
      ON CONFLICT (cycle_id, category_id, subject_type, subject_id) DO UPDATE
        SET eligible = EXCLUDED.eligible, qualification_score = EXCLUDED.qualification_score,
            disqualification_reason = EXCLUDED.disqualification_reason, metadata = EXCLUDED.metadata, evaluated_at = EXCLUDED.evaluated_at
        WHERE public.award_eligibility.override = false;
    END IF;

    -- Anything from an earlier run that no longer qualifies as a candidate is cleared, unless an editor decided it.
    DELETE FROM public.award_eligibility
      WHERE cycle_id = p_cycle AND category_id = cat.id AND override = false AND evaluated_at < v_now;

    SELECT count(*)::int, count(*) FILTER (WHERE eligible)::int INTO v_candidates, v_eligible
      FROM public.award_eligibility WHERE cycle_id = p_cycle AND category_id = cat.id;
    v_summary := v_summary || jsonb_build_object(cat.slug, jsonb_build_object(
      'candidates', v_candidates, 'eligible', v_eligible, 'enough_for_shortlist', v_eligible >= cat.min_nominees));
  END LOOP;

  PERFORM public.award_log('qualification_run', 'award_cycle', p_cycle, NULL, v_summary, NULL);
  RETURN v_summary;
END;
$$;

-- An editor's eligibility decision. A reason is required and the audit log keeps it.
CREATE OR REPLACE FUNCTION public.award_set_eligibility(p_cycle uuid, p_category uuid, p_subject_type text, p_subject_id uuid, p_eligible boolean, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  e public.award_eligibility%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  IF length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the public record of changes' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  IF NOT FOUND OR c.status NOT IN ('qualification', 'shortlist_review') THEN
    RAISE EXCEPTION 'Eligibility can only change while the shortlist is being prepared' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO e FROM public.award_eligibility
    WHERE cycle_id = p_cycle AND category_id = p_category AND subject_type = p_subject_type AND subject_id = p_subject_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'That candidate is not in this cycle' USING ERRCODE = '23514'; END IF;

  UPDATE public.award_eligibility
    SET eligible = p_eligible, override = true,
        disqualification_reason = CASE WHEN p_eligible THEN NULL ELSE 'Editor decision: ' || btrim(p_reason) END,
        evaluated_at = now()
    WHERE id = e.id;

  IF NOT p_eligible THEN
    UPDATE public.award_nominees SET status = 'disqualified'
      WHERE cycle_id = p_cycle AND category_id = p_category AND subject_type = p_subject_type AND subject_id = p_subject_id
        AND status IN ('proposed', 'approved');
  END IF;

  PERFORM public.award_log(CASE WHEN p_eligible THEN 'eligibility_restored' ELSE 'disqualified' END, 'award_eligibility', e.id,
    jsonb_build_object('eligible', e.eligible, 'reason', e.disqualification_reason),
    jsonb_build_object('eligible', p_eligible), p_reason);
END;
$$;

-- 8. Shortlist ---------------------------------------------------------------------------------------
-- Suggests up to max_nominees per category from the eligible candidates, best first. A category with
-- fewer eligible candidates than min_nominees gets no suggestions: it will be "not awarded".
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
               format('Suggested by the system: ranked %s on the qualification score of %s', r.rk, round(r.qualification_score, 3))
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

CREATE OR REPLACE FUNCTION public.award_shortlist_approve(p_nominee uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n public.award_nominees%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  SELECT * INTO n FROM public.award_nominees WHERE id = p_nominee;
  IF NOT FOUND THEN RAISE EXCEPTION 'That nominee does not exist' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.award_cycles WHERE id = n.cycle_id AND status = 'shortlist_review') THEN
    RAISE EXCEPTION 'Nominees can only be approved while the shortlist is in review' USING ERRCODE = '23514';
  END IF;
  IF n.status <> 'proposed' THEN RAISE EXCEPTION 'Only proposed nominees can be approved' USING ERRCODE = '23514'; END IF;
  UPDATE public.award_nominees SET status = 'approved' WHERE id = p_nominee;
  PERFORM public.award_log('nominee_approved', 'award_nominee', p_nominee, jsonb_build_object('status', n.status), jsonb_build_object('status', 'approved'), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_shortlist_approve_all(p_cycle uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  PERFORM public.award_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.award_cycles WHERE id = p_cycle AND status = 'shortlist_review') THEN
    RAISE EXCEPTION 'Nominees can only be approved while the shortlist is in review' USING ERRCODE = '23514';
  END IF;
  UPDATE public.award_nominees SET status = 'approved' WHERE cycle_id = p_cycle AND status = 'proposed';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM public.award_log('nominees_approved_all', 'award_cycle', p_cycle, NULL, jsonb_build_object('approved', n), NULL);
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_shortlist_remove(p_nominee uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n public.award_nominees%ROWTYPE;
BEGIN
  PERFORM public.award_require_admin();
  IF length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO n FROM public.award_nominees WHERE id = p_nominee;
  IF NOT FOUND THEN RAISE EXCEPTION 'That nominee does not exist' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.award_cycles WHERE id = n.cycle_id AND status = 'shortlist_review') THEN
    RAISE EXCEPTION 'Nominees can only be removed while the shortlist is in review' USING ERRCODE = '23514';
  END IF;
  IF n.status NOT IN ('proposed', 'approved') THEN RAISE EXCEPTION 'That nominee is already off the shortlist' USING ERRCODE = '23514'; END IF;
  UPDATE public.award_nominees SET status = 'withdrawn' WHERE id = p_nominee;
  PERFORM public.award_log('nominee_removed', 'award_nominee', p_nominee, jsonb_build_object('status', n.status), jsonb_build_object('status', 'withdrawn'), p_reason);
END;
$$;

-- Adds an eligible candidate the system did not suggest (or reinstates one that was removed).
CREATE OR REPLACE FUNCTION public.award_shortlist_add(p_cycle uuid, p_category uuid, p_subject_type text, p_subject_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cat public.award_categories%ROWTYPE;
  v_active int;
  v_id uuid;
BEGIN
  PERFORM public.award_require_admin();
  IF length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.award_cycles WHERE id = p_cycle AND status = 'shortlist_review') THEN
    RAISE EXCEPTION 'Nominees can only be added while the shortlist is in review' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO cat FROM public.award_categories WHERE id = p_category;
  IF NOT FOUND THEN RAISE EXCEPTION 'That category does not exist' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.award_eligibility
                 WHERE cycle_id = p_cycle AND category_id = p_category AND subject_type = p_subject_type AND subject_id = p_subject_id AND eligible) THEN
    RAISE EXCEPTION 'Only eligible candidates can be shortlisted' USING ERRCODE = '23514';
  END IF;
  SELECT count(*)::int INTO v_active FROM public.award_nominees
    WHERE cycle_id = p_cycle AND category_id = p_category AND status IN ('proposed', 'approved');
  IF v_active >= cat.max_nominees THEN
    RAISE EXCEPTION 'This category already has the most nominees it can have (%)', cat.max_nominees USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.award_nominees (cycle_id, category_id, subject_type, subject_id, shortlist_rank, status, selection_reason)
  VALUES (p_cycle, p_category, p_subject_type, p_subject_id, v_active + 1, 'approved', btrim(p_reason))
  ON CONFLICT (cycle_id, category_id, subject_type, subject_id) DO UPDATE
    SET status = 'approved', selection_reason = btrim(p_reason)
    WHERE public.award_nominees.status = 'withdrawn'
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'That candidate is already on the shortlist' USING ERRCODE = '23514'; END IF;

  PERFORM public.award_log('nominee_added', 'award_nominee', v_id, NULL, jsonb_build_object('subject_type', p_subject_type, 'subject_id', p_subject_id), p_reason);
  RETURN v_id;
END;
$$;

-- 9. Stages --------------------------------------------------------------------------------------------
-- This slice covers setting a cycle up and publishing its shortlist. Voting, jury and results stages are
-- added by the later slices, which extend this function.
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
    ('shortlist_review', 'shortlist_published'), ('shortlist_published', 'shortlist_review'));
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

  -- Pulling a published shortlist back is a public event, so it needs a reason.
  IF c.status = 'shortlist_published' AND length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why the shortlist is being pulled back, in a few words' USING ERRCODE = '23514';
  END IF;

  UPDATE public.award_cycles SET status = p_to, updated_at = now() WHERE id = p_cycle;
  PERFORM public.award_log('cycle_stage_changed', 'award_cycle', p_cycle,
    jsonb_build_object('status', c.status), jsonb_build_object('status', p_to), p_reason);
END;
$$;

-- 10. Access ------------------------------------------------------------------------------------------
ALTER TABLE public.award_programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_cycles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_nominees    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.take_standouts    ENABLE ROW LEVEL SECURITY;

-- Nothing in the award tables is writable from the browser. Writes go through the award_* functions.
DROP POLICY IF EXISTS "award_programs_read" ON public.award_programs;
CREATE POLICY "award_programs_read" ON public.award_programs FOR SELECT USING (active OR public.is_admin());

DROP POLICY IF EXISTS "award_categories_read" ON public.award_categories;
CREATE POLICY "award_categories_read" ON public.award_categories FOR SELECT USING (active OR public.is_admin());

DROP POLICY IF EXISTS "award_cycles_read" ON public.award_cycles;
CREATE POLICY "award_cycles_read" ON public.award_cycles FOR SELECT USING (
  status IN ('shortlist_published', 'voting_open', 'voting_closed', 'jury_review', 'results_locked', 'published', 'archived')
  OR public.is_admin());

DROP POLICY IF EXISTS "award_nominees_read" ON public.award_nominees;
CREATE POLICY "award_nominees_read" ON public.award_nominees FOR SELECT USING (
  public.is_admin()
  OR (status IN ('approved', 'winner', 'runner_up') AND EXISTS (
    SELECT 1 FROM public.award_cycles c WHERE c.id = cycle_id
      AND c.status IN ('shortlist_published', 'voting_open', 'voting_closed', 'jury_review', 'results_locked', 'published', 'archived'))));

DROP POLICY IF EXISTS "award_eligibility_admin" ON public.award_eligibility;
CREATE POLICY "award_eligibility_admin" ON public.award_eligibility FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "award_audit_admin" ON public.award_audit_log;
CREATE POLICY "award_audit_admin" ON public.award_audit_log FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "take_standouts_own_read" ON public.take_standouts;
CREATE POLICY "take_standouts_own_read" ON public.take_standouts FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "take_standouts_own_insert" ON public.take_standouts;
CREATE POLICY "take_standouts_own_insert" ON public.take_standouts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "take_standouts_own_update" ON public.take_standouts;
CREATE POLICY "take_standouts_own_update" ON public.take_standouts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "take_standouts_own_delete" ON public.take_standouts;
CREATE POLICY "take_standouts_own_delete" ON public.take_standouts FOR DELETE USING (auth.uid() = user_id);

-- Internals are not callable by the public. Admin-facing functions check is_admin() themselves,
-- and Supabase grants new functions to anon and authenticated by default, so anon is revoked too.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'award_require_admin()', 'award_log(text,text,uuid,jsonb,jsonb,text)',
    'award_film_metrics(uuid,int,numeric)',
    'award_create_cycle(uuid,date)', 'award_update_cycle_dates(uuid,timestamptz,timestamptz,timestamptz,timestamptz,text)',
    'award_run_qualification(uuid)', 'award_set_eligibility(uuid,uuid,text,uuid,boolean,text)',
    'award_suggest_shortlist(uuid)', 'award_shortlist_approve(uuid)', 'award_shortlist_approve_all(uuid)',
    'award_shortlist_remove(uuid,text)', 'award_shortlist_add(uuid,uuid,text,uuid,text)',
    'award_advance_cycle(uuid,text,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', f);
    END IF;
  END LOOP;
  -- The helpers and the metrics function are for other functions only, not for signed-in users either.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_log(text,text,uuid,jsonb,jsonb,text) FROM authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_film_metrics(uuid,int,numeric) FROM authenticated';
  END IF;
END $$;
