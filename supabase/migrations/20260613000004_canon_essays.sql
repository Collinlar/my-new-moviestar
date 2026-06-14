ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS canon_essay TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS canon_essay_author TEXT DEFAULT 'MuvieStars Editorial';
