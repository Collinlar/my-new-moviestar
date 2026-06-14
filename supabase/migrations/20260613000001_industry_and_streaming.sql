-- =============================================================
-- Add industry column and streaming_links to movies
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.
-- =============================================================

ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'Other';

ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS streaming_links JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_movies_industry ON public.movies(industry);

-- =============================================================
-- Auto-populate industry from existing country / language data
-- =============================================================
UPDATE public.movies SET industry =
  CASE
    WHEN country = 'Nigeria' AND language = 'yoruba'  THEN 'Nollywood Yoruba'
    WHEN country = 'Nigeria'                           THEN 'Nollywood'
    WHEN country = 'Ghana'                             THEN 'Ghallywood'
    WHEN country = 'Uganda'                            THEN 'Wakaliwood'
    WHEN language = 'french'
      OR country IN (
        'Senegal', 'Côte d''Ivoire', 'Ivory Coast', 'Cameroon',
        'Democratic Republic of Congo', 'DRC',
        'Morocco', 'Tunisia', 'Algeria', 'Mali', 'Burkina Faso',
        'Guinea', 'Togo', 'Benin', 'Madagascar', 'Rwanda'
      )                                                THEN 'Francophone'
    WHEN country = 'South Africa'                      THEN 'South African'
    WHEN country IN ('Kenya', 'Tanzania', 'Ethiopia', 'Rwanda') THEN 'East African'
    WHEN country IN ('Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Libya') THEN 'North African'
    ELSE 'Other'
  END
WHERE industry IS NULL OR industry = 'Other';
