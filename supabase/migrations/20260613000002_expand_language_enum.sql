-- Expand the movie_language enum to cover the full range of African cinema languages.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction, so each statement is independent.
-- IF NOT EXISTS makes each statement safe to re-run.

ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'arabic';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'amharic';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'wolof';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'pidgin';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'zulu';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'afrikaans';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'portuguese';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'lingala';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'somali';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'luganda';
ALTER TYPE public.movie_language ADD VALUE IF NOT EXISTS 'shona';
