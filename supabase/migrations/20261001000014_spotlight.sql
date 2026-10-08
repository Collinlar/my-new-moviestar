-- MuvieStars: the Spotlight, one film put in front of everyone at the top of the homepage for a set time.
--
-- Editorial only. There is no sponsor, price or paid placement anywhere in this table, on purpose: a Spotlight is
-- the editors saying "watch this", and it only means something if nobody can buy it.
--
--   * A Spotlight is a listed film, a short headline and line, a button (to the film or straight to where to watch it),
--     who sees it (everyone, signed-out visitors, signed-in members) and a start and an end time. It can run for at
--     most 60 days. Times are Ghana time, which is UTC all year.
--   * Only a listed film can be published. If a film is delisted while its Spotlight is running, visitors stop seeing it.
--   * Visitors can read a Spotlight only while it is published, inside its window, and the film is still listed.
--     Admins can read and write all of them.
--   * Two Spotlights can overlap. The one with higher priority is shown, then the one that started later. Only one is
--     ever shown at a time.
--   * spotlight_daily counts views and taps per day with no names, no devices and no places. spotlight_count() is the only
--     way to add to it and it only counts a Spotlight that is live right now.
--   * spotlight_log records every create, edit, publish, unpublish and delete, with who and what changed. It outlives the
--     Spotlight it describes.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.spotlights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id    uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  headline    text NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 3 AND 80),
  line        text CHECK (line IS NULL OR char_length(line) <= 160),
  cta_kind    text NOT NULL DEFAULT 'film' CHECK (cta_kind IN ('film', 'watch')),
  audience    text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone', 'signed_out', 'signed_in')),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  priority    integer NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spotlights_window_order CHECK (ends_at > starts_at),
  CONSTRAINT spotlights_window_length CHECK (ends_at - starts_at <= interval '60 days')
);

CREATE INDEX IF NOT EXISTS idx_spotlights_window ON public.spotlights (status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_spotlights_movie ON public.spotlights (movie_id);

-- Keeps updated_at honest, and refuses to publish a film that is not listed.
CREATE OR REPLACE FUNCTION public.spotlights_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND NOT EXISTS (SELECT 1 FROM public.movies m WHERE m.id = NEW.movie_id AND m.listing_status = 'approved') THEN
    RAISE EXCEPTION 'Only a listed film can be published as a Spotlight' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS spotlights_guard ON public.spotlights;
CREATE TRIGGER spotlights_guard BEFORE INSERT OR UPDATE ON public.spotlights
  FOR EACH ROW EXECUTE FUNCTION public.spotlights_guard();

ALTER TABLE public.spotlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spotlights_public_read_live" ON public.spotlights;
CREATE POLICY "spotlights_public_read_live" ON public.spotlights
  FOR SELECT USING (
    status = 'published' AND now() >= starts_at AND now() < ends_at
    AND EXISTS (SELECT 1 FROM public.movies m WHERE m.id = movie_id AND m.listing_status = 'approved')
  );

DROP POLICY IF EXISTS "spotlights_admin_all" ON public.spotlights;
CREATE POLICY "spotlights_admin_all" ON public.spotlights
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Counts ------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spotlight_daily (
  spotlight_id uuid NOT NULL REFERENCES public.spotlights(id) ON DELETE CASCADE,
  day          date NOT NULL,
  views        integer NOT NULL DEFAULT 0,
  taps         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (spotlight_id, day)
);

ALTER TABLE public.spotlight_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spotlight_daily_admin_read" ON public.spotlight_daily;
CREATE POLICY "spotlight_daily_admin_read" ON public.spotlight_daily FOR SELECT USING (public.is_admin());

-- Anyone may add one view or one tap to a Spotlight that is live right now. Nothing else, and nothing about who.
CREATE OR REPLACE FUNCTION public.spotlight_count(p_spotlight uuid, p_kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_kind NOT IN ('view', 'tap') THEN RETURN false; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.spotlights s JOIN public.movies m ON m.id = s.movie_id
    WHERE s.id = p_spotlight AND s.status = 'published' AND now() >= s.starts_at AND now() < s.ends_at AND m.listing_status = 'approved'
  ) THEN RETURN false; END IF;
  INSERT INTO public.spotlight_daily (spotlight_id, day, views, taps)
  VALUES (p_spotlight, (now() AT TIME ZONE 'UTC')::date, (p_kind = 'view')::int, (p_kind = 'tap')::int)
  ON CONFLICT (spotlight_id, day) DO UPDATE
    SET views = public.spotlight_daily.views + EXCLUDED.views, taps = public.spotlight_daily.taps + EXCLUDED.taps;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.spotlight_count(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spotlight_count(uuid, text) TO anon, authenticated;

-- Change log --------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spotlight_log (
  id            bigserial PRIMARY KEY,
  spotlight_id  uuid NOT NULL,
  movie_id      uuid,
  headline      text,
  action        text NOT NULL CHECK (action IN ('created', 'edited', 'published', 'unpublished', 'deleted')),
  changes       jsonb,
  actor         uuid,
  at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spotlight_log_at ON public.spotlight_log (at DESC);

ALTER TABLE public.spotlight_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spotlight_log_admin_read" ON public.spotlight_log;
CREATE POLICY "spotlight_log_admin_read" ON public.spotlight_log FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.spotlights_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  diff jsonb;
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.spotlight_log (spotlight_id, movie_id, headline, action, actor) VALUES (NEW.id, NEW.movie_id, NEW.headline, 'created', auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.spotlight_log (spotlight_id, movie_id, headline, action, actor) VALUES (OLD.id, OLD.movie_id, OLD.headline, 'deleted', auth.uid());
    RETURN OLD;
  END IF;

  SELECT jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)) INTO diff
  FROM jsonb_each(to_jsonb(NEW)) n JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
  WHERE n.value IS DISTINCT FROM o.value AND n.key <> 'updated_at';
  IF diff IS NULL THEN RETURN NEW; END IF;

  act := CASE
    WHEN OLD.status = 'draft' AND NEW.status = 'published' THEN 'published'
    WHEN OLD.status = 'published' AND NEW.status = 'draft' THEN 'unpublished'
    ELSE 'edited' END;
  INSERT INTO public.spotlight_log (spotlight_id, movie_id, headline, action, changes, actor) VALUES (NEW.id, NEW.movie_id, NEW.headline, act, diff, auth.uid());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS spotlights_log ON public.spotlights;
CREATE TRIGGER spotlights_log AFTER INSERT OR UPDATE OR DELETE ON public.spotlights
  FOR EACH ROW EXECUTE FUNCTION public.spotlights_log();
