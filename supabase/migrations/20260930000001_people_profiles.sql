-- People profiles: SEO-ready slugs, aliases, socials, claim + feature hooks,
-- a director sync so movies.director always mirrors the credits, and a backfill of
-- directors that only exist as text on the 755 seeded films.
-- Safe to run more than once.

-- 1. Profile columns ----------------------------------------------------------
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS slug        text,
  ADD COLUMN IF NOT EXISTS aliases     text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS socials     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS search_text text,
  ADD COLUMN IF NOT EXISTS claimed_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS is_featured boolean     NOT NULL DEFAULT false;

COMMENT ON COLUMN public.people.slug        IS 'Stable URL key for /person/[slug]. Set once, never regenerated, so links and backlinks keep working.';
COMMENT ON COLUMN public.people.aliases     IS 'Other spellings and stage names. Searched alongside full_name.';
COMMENT ON COLUMN public.people.socials     IS 'Keys: instagram, x, facebook, youtube, tiktok. Values are full URLs. Used for sameAs in schema.org markup.';
COMMENT ON COLUMN public.people.claimed_by  IS 'Set when the person (or their rep) has proven ownership of the profile. Foundation for claimed and sponsored profiles.';
COMMENT ON COLUMN public.people.is_featured IS 'Editorial or paid placement on the People page.';

-- 2. Slug generation ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_person_slug(p_name text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base      text;
  candidate text;
  n         int := 1;
BEGIN
  base := lower(coalesce(p_name, ''));
  base := translate(base,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
    'aaaaaaeeeeiiiiooooouuuuyync');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  IF base = '' THEN base := 'person'; END IF;

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.people WHERE slug = candidate AND id <> p_id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Runs on every insert and update: assigns a slug once, keeps search_text current.
CREATE OR REPLACE FUNCTION public.people_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_person_slug(NEW.full_name, NEW.id);
  END IF;
  -- Accent-folded so "chloe" finds "Chloé".
  NEW.search_text := trim(translate(
    lower(NEW.full_name || ' ' || coalesce(array_to_string(NEW.aliases, ' '), '')),
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
    'aaaaaaeeeeiiiiooooouuuuyync'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_before_write ON public.people;
CREATE TRIGGER people_before_write
  BEFORE INSERT OR UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.people_before_write();

-- 3. Backfill existing rows one at a time so collisions get -2, -3 suffixes ----
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, full_name FROM public.people WHERE slug IS NULL ORDER BY created_at, id LOOP
    UPDATE public.people SET slug = public.generate_person_slug(r.full_name, r.id) WHERE id = r.id;
  END LOOP;
  UPDATE public.people SET full_name = full_name WHERE search_text IS NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS people_slug_key ON public.people(slug);
ALTER TABLE public.people ALTER COLUMN slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_search_text ON public.people(search_text);
CREATE INDEX IF NOT EXISTS idx_people_featured    ON public.people(is_featured) WHERE is_featured;

-- 4. Keep movies.director in step with the director credits --------------------
CREATE OR REPLACE FUNCTION public.refresh_movie_director(p_movie_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.movies m
  SET director = (
    SELECT string_agg(p.full_name, ', ' ORDER BY mp.billing_order, mp.created_at)
    FROM public.movie_people mp
    JOIN public.people p ON p.id = mp.person_id
    WHERE mp.movie_id = p_movie_id AND mp.role = 'director'
  )
  WHERE m.id = p_movie_id;
$$;

CREATE OR REPLACE FUNCTION public.movie_people_sync_director()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN PERFORM public.refresh_movie_director(NEW.movie_id); END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.movie_id IS DISTINCT FROM NEW.movie_id) THEN
    PERFORM public.refresh_movie_director(OLD.movie_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS movie_people_sync_director ON public.movie_people;
CREATE TRIGGER movie_people_sync_director
  AFTER INSERT OR UPDATE OR DELETE ON public.movie_people
  FOR EACH ROW EXECUTE FUNCTION public.movie_people_sync_director();

-- A renamed person must update the director text on every film they directed.
CREATE OR REPLACE FUNCTION public.people_sync_director_on_rename()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT movie_id FROM public.movie_people WHERE person_id = NEW.id AND role = 'director' LOOP
    PERFORM public.refresh_movie_director(r.movie_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS people_sync_director_on_rename ON public.people;
CREATE TRIGGER people_sync_director_on_rename
  AFTER UPDATE OF full_name ON public.people
  FOR EACH ROW WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name)
  EXECUTE FUNCTION public.people_sync_director_on_rename();

-- 5. Backfill directors that only exist as text --------------------------------
-- The earlier backfill ran before the films were seeded, so most directors are text-only.
-- Names split on comma, ampersand, slash or " and ". Matching is case-insensitive.
INSERT INTO public.people (full_name)
SELECT DISTINCT ON (lower(trim(t.n))) trim(t.n)
FROM public.movies m
CROSS JOIN LATERAL unnest(regexp_split_to_array(coalesce(m.director, ''), '\s*(,|&|/|\s+and\s+)\s*', 'i')) AS t(n)
WHERE length(trim(t.n)) > 1
  AND NOT EXISTS (SELECT 1 FROM public.people p WHERE lower(p.full_name) = lower(trim(t.n)));

INSERT INTO public.movie_people (movie_id, person_id, role, billing_order)
SELECT DISTINCT ON (m.id, p.id) m.id, p.id, 'director'::person_role, t.ord::int
FROM public.movies m
CROSS JOIN LATERAL unnest(regexp_split_to_array(coalesce(m.director, ''), '\s*(,|&|/|\s+and\s+)\s*', 'i'))
  WITH ORDINALITY AS t(n, ord)
JOIN public.people p ON lower(p.full_name) = lower(trim(t.n))
WHERE length(trim(t.n)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.movie_people mp
    WHERE mp.movie_id = m.id AND mp.person_id = p.id AND mp.role = 'director'
  )
ORDER BY m.id, p.id, t.ord;
