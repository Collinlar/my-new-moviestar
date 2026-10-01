-- Curation: how films reach the catalogue, and how the best of them are highlighted.
--   movie_listing_submissions  a filmmaker or rights-holder puts their own film forward
--   movie_nominations          a viewer nominates a film that is not listed yet
--   selections / selection_items  editorial sets: the MuvieStars Selection (level 2 of the prestige ladder)
-- A submission or a nomination never lists anything by itself. Editors still decide, using the
-- existing listing queue. Safe to run more than once. Needs 20260930000002_catalogue_listing.sql.

-- 1. Filmmaker / rights-holder submissions -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_listing_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'needs_information', 'accepted', 'declined')),
  title            text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  release_year     int  NOT NULL CHECK (release_year BETWEEN 1900 AND 2100),
  country          text NOT NULL CHECK (char_length(btrim(country)) BETWEEN 1 AND 80),
  director         text CHECK (director IS NULL OR char_length(director) <= 120),
  synopsis         text NOT NULL CHECK (char_length(btrim(synopsis)) BETWEEN 40 AND 2000),
  submitter_role   text NOT NULL CHECK (submitter_role IN ('filmmaker', 'producer', 'distributor', 'studio', 'representative', 'other')),
  organisation     text CHECK (organisation IS NULL OR char_length(organisation) <= 120),
  contact_email    text NOT NULL CHECK (char_length(contact_email) <= 200 AND contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  evidence_url     text NOT NULL CHECK (char_length(evidence_url) <= 500 AND evidence_url ~* '^https?://'),
  poster_url       text CHECK (poster_url IS NULL OR (char_length(poster_url) <= 500 AND poster_url ~* '^https?://')),
  rights_confirmed boolean NOT NULL CHECK (rights_confirmed),
  -- Shown to the submitter. Never put anything private here.
  public_note      text CHECK (public_note IS NULL OR char_length(public_note) <= 500),
  decline_reason   text,
  movie_id         uuid REFERENCES public.movies(id) ON DELETE SET NULL,
  reviewed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.movie_listing_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user   ON public.movie_listing_submissions (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.submissions_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE open_count int;
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF NEW.release_year > extract(year FROM now())::int + 2 THEN
      RAISE EXCEPTION 'That release year is too far ahead' USING ERRCODE = '23514';
    END IF;
    -- A person can have a handful of submissions waiting at once, not a flood.
    SELECT count(*) INTO open_count FROM public.movie_listing_submissions
      WHERE user_id = NEW.user_id AND status IN ('received', 'needs_information');
    IF open_count >= 5 THEN
      RAISE EXCEPTION 'You already have 5 submissions waiting for a decision' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_guard ON public.movie_listing_submissions;
CREATE TRIGGER submissions_guard
  BEFORE INSERT OR UPDATE ON public.movie_listing_submissions
  FOR EACH ROW EXECUTE FUNCTION public.submissions_guard();

-- 2. Community nominations ---------------------------------------------------------------------
-- Either a film already in the catalogue but not listed (movie_id), or one we do not have yet (title).
CREATE TABLE IF NOT EXISTS public.movie_nominations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id     uuid REFERENCES public.movies(id) ON DELETE CASCADE,
  title        text CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 120),
  release_year int  CHECK (release_year IS NULL OR release_year BETWEEN 1900 AND 2100),
  link         text CHECK (link IS NULL OR (char_length(link) <= 500 AND link ~* '^https?://')),
  reason       text CHECK (reason IS NULL OR char_length(reason) <= 300),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nominations_one_target CHECK ((movie_id IS NOT NULL) <> (title IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS nominations_one_per_film
  ON public.movie_nominations (user_id, movie_id) WHERE movie_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS nominations_one_per_title
  ON public.movie_nominations (user_id, lower(btrim(title)), coalesce(release_year, 0)) WHERE movie_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_nominations_movie ON public.movie_nominations (movie_id) WHERE movie_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.nominations_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status text;
  recent int;
BEGIN
  IF NEW.movie_id IS NOT NULL THEN
    SELECT listing_status INTO status FROM public.movies WHERE id = NEW.movie_id;
    IF status = 'approved' THEN
      RAISE EXCEPTION 'That film is already listed' USING ERRCODE = '23514';
    ELSIF status IN ('rejected', 'archived', 'delisted') THEN
      RAISE EXCEPTION 'That film has been reviewed and is not open for nominations' USING ERRCODE = '23514';
    END IF;
  END IF;
  SELECT count(*) INTO recent FROM public.movie_nominations
    WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours';
  IF recent >= 10 THEN
    RAISE EXCEPTION 'You have made 10 nominations in the last day' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nominations_guard ON public.movie_nominations;
CREATE TRIGGER nominations_guard
  BEFORE INSERT ON public.movie_nominations
  FOR EACH ROW EXECUTE FUNCTION public.nominations_guard();

-- Anyone can see how many people nominated a film, without seeing who.
CREATE OR REPLACE FUNCTION public.nomination_count(p_movie uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT count(*)::int FROM public.movie_nominations WHERE movie_id = p_movie $$;

-- 3. Selections ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.selections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  label        text NOT NULL DEFAULT 'MuvieStars Selection'
                 CHECK (label IN ('MuvieStars Selection', 'Editor''s Selection', 'This Month''s Selection')),
  intro        text CHECK (intro IS NULL OR char_length(intro) <= 600),
  period       text CHECK (period IS NULL OR period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order   int NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_selections_status ON public.selections (status, period DESC, sort_order);

CREATE TABLE IF NOT EXISTS public.selection_items (
  selection_id uuid NOT NULL REFERENCES public.selections(id) ON DELETE CASCADE,
  movie_id     uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  position     int  NOT NULL DEFAULT 0,
  -- Why this film is in the Selection. Written by an editor, shown on the Selection page.
  note         text CHECK (note IS NULL OR char_length(note) <= 300),
  added_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (selection_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_selection_items_movie ON public.selection_items (movie_id);

-- Only listed films can be selected. A Selection sits above Listed on the ladder, never beside it.
CREATE OR REPLACE FUNCTION public.enforce_selection_item_listed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.movies WHERE id = NEW.movie_id AND listing_status = 'approved') THEN
    RAISE EXCEPTION 'Only listed films can be added to a Selection' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS selection_items_listed_only ON public.selection_items;
CREATE TRIGGER selection_items_listed_only
  BEFORE INSERT OR UPDATE OF movie_id ON public.selection_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_selection_item_listed();

CREATE OR REPLACE FUNCTION public.selections_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS selections_touch ON public.selections;
CREATE TRIGGER selections_touch
  BEFORE INSERT OR UPDATE ON public.selections
  FOR EACH ROW EXECUTE FUNCTION public.selections_touch();

-- 4. Access -------------------------------------------------------------------------------------
ALTER TABLE public.movie_listing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_nominations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selections                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selection_items           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_own_read" ON public.movie_listing_submissions;
CREATE POLICY "submissions_own_read" ON public.movie_listing_submissions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- A new submission starts as "received" with none of the editor fields filled in.
DROP POLICY IF EXISTS "submissions_own_insert" ON public.movie_listing_submissions;
CREATE POLICY "submissions_own_insert" ON public.movie_listing_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND status = 'received'
    AND movie_id IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL
    AND public_note IS NULL AND decline_reason IS NULL
  );

DROP POLICY IF EXISTS "submissions_admin_write" ON public.movie_listing_submissions;
CREATE POLICY "submissions_admin_write" ON public.movie_listing_submissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "nominations_own_read" ON public.movie_nominations;
CREATE POLICY "nominations_own_read" ON public.movie_nominations
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "nominations_own_insert" ON public.movie_nominations;
CREATE POLICY "nominations_own_insert" ON public.movie_nominations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nominations_own_delete" ON public.movie_nominations;
CREATE POLICY "nominations_own_delete" ON public.movie_nominations
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "selections_public_read" ON public.selections;
CREATE POLICY "selections_public_read" ON public.selections
  FOR SELECT USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "selections_admin_write" ON public.selections;
CREATE POLICY "selections_admin_write" ON public.selections
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "selection_items_public_read" ON public.selection_items;
CREATE POLICY "selection_items_public_read" ON public.selection_items
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.selections s WHERE s.id = selection_id AND s.status = 'published')
  );

DROP POLICY IF EXISTS "selection_items_admin_write" ON public.selection_items;
CREATE POLICY "selection_items_admin_write" ON public.selection_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
