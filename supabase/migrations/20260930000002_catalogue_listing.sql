-- Catalogue listing: every film has a listing status, every decision is logged, and the
-- eligibility checklist lives in one place (the movie_listing_queue view) so the admin
-- screen and the approval API can never disagree about what "ready" means.
-- Safe to run more than once.

-- 1. Listing columns -----------------------------------------------------------
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS listing_status           text        NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS listing_reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS listing_reviewed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listing_rejection_reason text,
  ADD COLUMN IF NOT EXISTS listing_notes            text,
  ADD COLUMN IF NOT EXISTS why_listed               text;

DO $$
BEGIN
  ALTER TABLE public.movies ADD CONSTRAINT movies_listing_status_check CHECK (listing_status IN (
    'draft', 'submitted', 'under_review', 'needs_information',
    'approved', 'rejected', 'archived', 'delisted'
  ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.movies ADD CONSTRAINT movies_why_listed_length CHECK (why_listed IS NULL OR char_length(why_listed) <= 300);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_movies_listing_status ON public.movies(listing_status);

COMMENT ON COLUMN public.movies.listing_status IS 'Only approved films get the public MuvieStars Listed mark and appear in curated discovery (Swipe, Selection, recommendations). Other pages stay reachable.';
COMMENT ON COLUMN public.movies.why_listed     IS 'Short editorial "Why it''s on MuvieStars". Written by a person, never auto-generated.';
COMMENT ON COLUMN public.movies.listing_notes  IS 'Latest internal note from a listing decision. Not shown publicly.';

-- 2. Decision history ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_listing_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id    uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status text,
  to_status   text NOT NULL,
  reason      text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_reviews_movie ON public.movie_listing_reviews(movie_id, created_at DESC);

ALTER TABLE public.movie_listing_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_reviews_admin_read" ON public.movie_listing_reviews;
CREATE POLICY "listing_reviews_admin_read" ON public.movie_listing_reviews
  FOR SELECT USING (public.is_admin());

-- Written only by the trigger below (security definer), never directly by a client.
CREATE OR REPLACE FUNCTION public.log_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.listing_status IS DISTINCT FROM OLD.listing_status THEN
    INSERT INTO public.movie_listing_reviews (movie_id, reviewer_id, from_status, to_status, reason, note)
    VALUES (NEW.id, COALESCE(NEW.listing_reviewed_by, auth.uid()), OLD.listing_status, NEW.listing_status,
            NEW.listing_rejection_reason, NEW.listing_notes);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS movies_log_listing_change ON public.movies;
CREATE TRIGGER movies_log_listing_change
  AFTER UPDATE OF listing_status ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.log_listing_change();

-- 3. Eligibility checklist (PRD section 8) -------------------------------------
-- "hard" checks must pass before a film can be approved. The rest are flagged, not blocking,
-- because most of the existing catalogue has no cast and crew data yet.
CREATE OR REPLACE VIEW public.movie_listing_queue
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.title,
  m.release_year,
  m.country,
  m.industry,
  m.genre,
  m.poster_url,
  (m.youtube_url IS NOT NULL AND m.youtube_url <> '') AS has_video,
  m.listing_status,
  m.listing_rejection_reason,
  m.listing_reviewed_at,
  m.created_at,
  c.credit_count,
  -- hard checks
  (char_length(btrim(coalesce(m.title, ''))) > 0)                                        AS ok_title,
  (m.release_year IS NOT NULL
     AND m.release_year BETWEEN 1900 AND (extract(year FROM now())::int + 2))            AS ok_year,
  (char_length(btrim(coalesce(m.country, ''))) > 0)                                      AS ok_country,
  (greatest(char_length(coalesce(m.synopsis, '')), char_length(coalesce(m.description, ''))) >= 80) AS ok_synopsis,
  (coalesce(m.poster_url, '') ~* '^https?://')                                           AS ok_poster,
  (coalesce(m.youtube_url, '') ~* '^https?://'
     OR (jsonb_typeof(m.streaming_links) = 'array' AND jsonb_array_length(m.streaming_links) > 0)
     OR char_length(btrim(coalesce(m.festivals, ''))) > 0
     OR EXISTS (SELECT 1 FROM public.movie_awards a WHERE a.movie_id = m.id))            AS ok_evidence,
  -- flagged, not blocking
  (c.credit_count > 0 OR char_length(btrim(coalesce(m.director, ''))) > 0)               AS ok_credits,
  (coalesce(m.title, '') !~ '\|' AND char_length(coalesce(m.title, '')) <= 80)           AS ok_clean_title
FROM public.movies m
CROSS JOIN LATERAL (
  SELECT count(*)::int AS credit_count
  FROM public.movie_people mp
  WHERE mp.movie_id = m.id AND mp.role IN ('director', 'actor')
) c;

-- hard_ready and completeness are derived from the checks above.
CREATE OR REPLACE VIEW public.movie_listing_queue_scored
WITH (security_invoker = true) AS
SELECT
  q.*,
  (q.ok_title AND q.ok_year AND q.ok_country AND q.ok_synopsis AND q.ok_poster AND q.ok_evidence) AS hard_ready,
  (q.ok_title::int + q.ok_year::int + q.ok_country::int + q.ok_synopsis::int + q.ok_poster::int
     + q.ok_evidence::int + q.ok_credits::int + q.ok_clean_title::int)                            AS completeness
FROM public.movie_listing_queue q;

-- 4. Starter set ---------------------------------------------------------------
-- Runs once, only while nothing has ever been decided. Films that were already featured,
-- Canon, a Club pick, or reviewed before listing existed start as approved (if they meet the
-- hard minimum) so Swipe and the homepage do not go empty. Everything else starts as draft.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.movie_listing_reviews) THEN
    UPDATE public.movies m
    SET listing_status      = 'approved',
        listing_reviewed_at = now(),
        listing_notes       = 'Starter set: featured, Canon, Club or reviewed before listing statuses existed. Re-check in the listing queue.'
    FROM public.movie_listing_queue_scored q
    WHERE q.id = m.id
      AND q.hard_ready
      AND m.listing_status = 'draft'
      AND (
        m.is_canon
        OR m.featured
        OR coalesce(m.is_featured, false)
        OR m.review_count > 0
        OR EXISTS (SELECT 1 FROM public.club_cycles cc WHERE cc.movie_id = m.id)
      );
  END IF;
END $$;
