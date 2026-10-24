-- MuvieStars: a film no longer needs a YouTube link to be added.
--
-- movies.youtube_url was created as NOT NULL back when every film was a YouTube upload. Most of the app already treats the
-- link as optional (a film can also be watched on Netflix and so on, or have no place to watch yet), and the Add a movie
-- form now lets the admin leave it blank. This lets the database agree.
-- Safe to run more than once. Nothing else changes: films that already have a link keep it.

ALTER TABLE public.movies ALTER COLUMN youtube_url DROP NOT NULL;
