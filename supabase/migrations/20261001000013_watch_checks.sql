-- MuvieStars: what we know about where a film can actually be watched.
--
-- Most films link to a YouTube video. A link tells a viewer nothing until they tap it: is it the full film, who put it
-- there, how long is it, does it have subtitles, and (the one that matters in Accra) does it play in Ghana at all.
-- YouTube can answer all of that. movie_watch_checks stores the answer for each film's youtube_url, with the date it
-- was last checked, so the film page can say it up front and Swipe can hide links that are dead or blocked.
--
--   * One row per film. Readable by everyone (it is only public facts about a public video). Written by admins.
--   * state is what a viewer cares about: ok, ghana_blocked, gone (deleted, private or removed), not_a_video
--     (a channel or playlist link), unchecked.
--   * Streaming links on movies.streaming_links are jsonb, so the new per-link detail (how to access it, the price
--     in GHS, where it works, a short note) needs no column and no migration.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.movie_watch_checks (
  movie_id          uuid PRIMARY KEY REFERENCES public.movies(id) ON DELETE CASCADE,
  video_id          text,
  state             text NOT NULL DEFAULT 'unchecked'
                    CHECK (state IN ('ok', 'ghana_blocked', 'gone', 'not_a_video', 'unchecked')),
  source            text NOT NULL DEFAULT 'oembed' CHECK (source IN ('api', 'oembed')),
  channel_title     text,
  channel_id        text,
  duration_seconds  integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  published_at      timestamptz,
  captions          boolean,
  definition        text CHECK (definition IS NULL OR definition IN ('hd', 'sd')),
  region_mode       text CHECK (region_mode IS NULL OR region_mode IN ('allowed', 'blocked')),
  region_codes      text[],
  note              text,
  checked_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movie_watch_checks_state ON public.movie_watch_checks (state);

ALTER TABLE public.movie_watch_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movie_watch_checks_public_read" ON public.movie_watch_checks;
CREATE POLICY "movie_watch_checks_public_read" ON public.movie_watch_checks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "movie_watch_checks_admin_write" ON public.movie_watch_checks;
CREATE POLICY "movie_watch_checks_admin_write" ON public.movie_watch_checks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
