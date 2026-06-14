-- =============================================================
-- STEP 1: Rename review_text → content
-- Safe to re-run: if column is already named "content" this errors
-- and you can ignore that specific error.
-- =============================================================
ALTER TABLE public.reviews RENAME COLUMN review_text TO content;

-- =============================================================
-- STEP 2: Update movie rating trigger (only count approved reviews)
-- CREATE OR REPLACE is always idempotent.
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_movie_rating()
RETURNS TRIGGER AS $func$
BEGIN
  UPDATE public.movies
  SET
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.reviews
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
        AND status = 'approved'
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
        AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);
  RETURN COALESCE(NEW, OLD);
END;
$func$ LANGUAGE plpgsql;

-- =============================================================
-- STEP 3: Watchlist table
-- =============================================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id       UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id  ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_movie_id ON public.watchlists(movie_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_added_at ON public.watchlists(added_at DESC);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Drop before create — no DO blocks needed
DROP POLICY IF EXISTS "Users can view their own watchlist"    ON public.watchlists;
DROP POLICY IF EXISTS "Users can add to their watchlist"      ON public.watchlists;
DROP POLICY IF EXISTS "Users can remove from their watchlist" ON public.watchlists;
DROP POLICY IF EXISTS "Admins can view all watchlists"        ON public.watchlists;

CREATE POLICY "Users can view their own watchlist"
  ON public.watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their watchlist"
  ON public.watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their watchlist"
  ON public.watchlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all watchlists"
  ON public.watchlists FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'kofcollkcl100@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================
-- STEP 4: Review policies
-- =============================================================
DROP POLICY IF EXISTS "Users can create their own reviews"  ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews"           ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews"  ON public.reviews;

CREATE POLICY "Users can create their own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING (
    (auth.jwt() ->> 'email') = 'kofcollkcl100@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);
