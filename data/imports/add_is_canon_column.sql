-- Add is_canon column to movies table
-- Run this in the Supabase SQL editor before using the Canon page or marking films as canonical.

ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS is_canon BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_movies_is_canon ON public.movies(is_canon);

COMMENT ON COLUMN public.movies.is_canon IS 'True for films selected by the MuvieStars editorial team as part of the African Film Canon.';

-- After running this, mark your canonical films like this:
-- UPDATE movies SET is_canon = true WHERE title IN (
--   'Half of a Yellow Sun',
--   'Lionheart',
--   'The Wedding Party',
--   'Beasts of No Nation',
--   'Tsotsi',
--   'District 9'
--   -- add more titles here
-- );

-- Verify
SELECT COUNT(*) AS total_canon FROM movies WHERE is_canon = true;
