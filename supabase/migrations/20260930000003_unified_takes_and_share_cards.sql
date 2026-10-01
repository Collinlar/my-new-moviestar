-- Unified takes + general share cards.
-- Additive and reversible: no review data is moved or rewritten. Safe to run more than once.

-- 1. One model for a person's opinion of a film -------------------------------
-- A "take" is what one person thinks of one film. Today that opinion can live in two tables:
--   movie_reactions  quick review: reaction, star rating, standout tags, one-line take
--   reviews          full written review with a star rating and moderation
-- This view joins them per (user, film) into the PRD's single model:
--   reaction, rating, quick_take, full_review
-- Only visible rows count: published reactions and approved reviews.
-- If both sources rate the same film, the most recently edited rating wins.
-- A review with no quick reaction gets a derived one (5 loved, 4 liked, 3 okay, 1-2 not for me)
-- so every take has a reaction. reaction_derived says when that happened.
CREATE OR REPLACE VIEW public.takes
WITH (security_invoker = true) AS
WITH q AS (
  SELECT id, user_id, movie_id, reaction, rating, one_liner, created_at, updated_at
  FROM public.movie_reactions
  WHERE status = 'published'
), f AS (
  SELECT id, user_id, movie_id, rating, content, review_type, helpful_count, created_at, updated_at
  FROM public.reviews
  WHERE status = 'approved'
)
SELECT
  coalesce(q.user_id, f.user_id)   AS user_id,
  coalesce(q.movie_id, f.movie_id) AS movie_id,
  q.id                             AS reaction_id,
  f.id                             AS review_id,
  coalesce(q.reaction,
    CASE WHEN f.rating >= 5 THEN 'loved'
         WHEN f.rating = 4  THEN 'liked'
         WHEN f.rating = 3  THEN 'okay'
         WHEN f.rating <= 2 THEN 'not_for_me' END)            AS reaction,
  (q.reaction IS NULL AND f.rating IS NOT NULL)                AS reaction_derived,
  CASE WHEN f.id IS NOT NULL AND (q.id IS NULL OR f.updated_at >= q.updated_at)
       THEN coalesce(f.rating, q.rating)
       ELSE coalesce(q.rating, f.rating) END                   AS rating,
  q.one_liner                                                  AS quick_take,
  f.content                                                    AS full_review,
  f.review_type                                                AS review_type,
  coalesce(f.helpful_count, 0)                                 AS helpful_count,
  least(q.created_at, f.created_at)                            AS created_at,
  greatest(q.updated_at, f.updated_at)                         AS updated_at
FROM q
FULL OUTER JOIN f ON f.user_id = q.user_id AND f.movie_id = q.movie_id;

COMMENT ON VIEW public.takes IS 'One row per (user, film): reaction, rating, quick_take, full_review. The single source for verdicts, film rating stats, reviewer reputation and award eligibility.';

-- 2. Film rating stats count both sources -------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_movie_rating_stats(p_movie_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.movies m
  SET average_rating = coalesce((
        SELECT round(avg(t.rating)::numeric, 1) FROM public.takes t
        WHERE t.movie_id = p_movie_id AND t.rating IS NOT NULL), 0),
      review_count = (
        SELECT count(*) FROM public.takes t
        WHERE t.movie_id = p_movie_id AND t.rating IS NOT NULL)
  WHERE m.id = p_movie_id;
$$;

-- Replaces the old reviews-only body. The existing triggers on reviews keep calling it.
CREATE OR REPLACE FUNCTION public.update_movie_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_movie_rating_stats(NEW.movie_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.movie_id IS DISTINCT FROM NEW.movie_id) THEN
    PERFORM public.refresh_movie_rating_stats(OLD.movie_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS movie_reactions_rating_stats ON public.movie_reactions;
CREATE TRIGGER movie_reactions_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.movie_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_movie_rating();

SELECT public.refresh_movie_rating_stats(id)
FROM public.movies
WHERE id IN (SELECT movie_id FROM public.movie_reactions UNION SELECT movie_id FROM public.reviews);

-- 3. Share cards become general ----------------------------------------------
-- Awards add nomination, winner and ballot cards, so a card is no longer only a review card.
DO $$
BEGIN
  IF to_regclass('public.review_share_cards') IS NOT NULL AND to_regclass('public.share_cards') IS NULL THEN
    ALTER TABLE public.review_share_cards RENAME TO share_cards;
  END IF;
END $$;

ALTER TABLE public.share_cards
  ADD COLUMN IF NOT EXISTS object_type text  NOT NULL DEFAULT 'take',
  ADD COLUMN IF NOT EXISTS object_id   uuid,
  ADD COLUMN IF NOT EXISTS payload     jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.share_cards ALTER COLUMN reaction_id DROP NOT NULL;
ALTER TABLE public.share_cards ALTER COLUMN user_id     DROP NOT NULL;
ALTER TABLE public.share_cards ALTER COLUMN movie_id    DROP NOT NULL;

UPDATE public.share_cards SET object_id = reaction_id WHERE object_id IS NULL AND reaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS share_cards_object_key
  ON public.share_cards (object_type, object_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMENT ON COLUMN public.share_cards.object_type IS 'take, nomination, shortlist, winner, laurel, ballot. Decides which template renders the card.';
COMMENT ON COLUMN public.share_cards.object_id   IS 'Id of the thing being shared (for a take, the movie_reactions id).';

DROP POLICY IF EXISTS "share_cards_admin_write" ON public.share_cards;
CREATE POLICY "share_cards_admin_write" ON public.share_cards
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Who opened a shared link ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_visits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_card_id uuid NOT NULL REFERENCES public.share_cards(id) ON DELETE CASCADE,
  visited_at    timestamptz NOT NULL DEFAULT now(),
  referrer_host text,
  viewer_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_share_visits_card ON public.share_visits(share_card_id, visited_at DESC);

ALTER TABLE public.share_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_visits_insert_open" ON public.share_visits;
CREATE POLICY "share_visits_insert_open" ON public.share_visits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "share_visits_admin_read" ON public.share_visits;
CREATE POLICY "share_visits_admin_read" ON public.share_visits FOR SELECT USING (public.is_admin());
