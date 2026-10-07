-- MuvieStars: uploaded posters and banners.
--
-- Until now a film's picture was a pasted link, and nearly all of them are YouTube thumbnails: wide, low
-- resolution, often with black bars. This adds proper uploads, which the admin crops to portrait 2:3 (posters)
-- or 16:9 (banners) and which are saved as sized WebP copies.
--
--   * movies keeps poster_url as the one picture the whole site already reads. An uploaded poster sets it to the
--     page-size copy, so nothing that reads poster_url needs to change.
--   * New movies columns hold the other copies, a tiny blurred placeholder and a dominant colour (so a picture
--     arrives into a coloured box, not a hole), and a focal point (so wide placements crop around what matters).
--   * movie_images keeps a record of every upload, including the original file path, so a crop can be adjusted later
--     without uploading again, and so "remove the uploaded poster" can put the old link back.
--   * A new public storage bucket, "posters". Anyone can read. Only administrators can write. The older
--     "uploads" bucket lets any signed-in person upload, so it is not used for this.
-- Safe to run more than once.

-- 1. Columns on movies ------------------------------------------------------------------------------------------
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS poster_path     text,
  ADD COLUMN IF NOT EXISTS poster_sm_url   text,
  ADD COLUMN IF NOT EXISTS poster_lg_url   text,
  ADD COLUMN IF NOT EXISTS poster_blur     text,
  ADD COLUMN IF NOT EXISTS poster_color    text,
  ADD COLUMN IF NOT EXISTS poster_focus_x  real,
  ADD COLUMN IF NOT EXISTS poster_focus_y  real,
  ADD COLUMN IF NOT EXISTS banner_url      text,
  ADD COLUMN IF NOT EXISTS banner_path     text,
  ADD COLUMN IF NOT EXISTS banner_blur     text,
  ADD COLUMN IF NOT EXISTS banner_color    text,
  ADD COLUMN IF NOT EXISTS banner_focus_x  real,
  ADD COLUMN IF NOT EXISTS banner_focus_y  real;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movies_focus_in_range') THEN
    ALTER TABLE public.movies ADD CONSTRAINT movies_focus_in_range CHECK (
      (poster_focus_x IS NULL OR poster_focus_x BETWEEN 0 AND 1) AND (poster_focus_y IS NULL OR poster_focus_y BETWEEN 0 AND 1)
      AND (banner_focus_x IS NULL OR banner_focus_x BETWEEN 0 AND 1) AND (banner_focus_y IS NULL OR banner_focus_y BETWEEN 0 AND 1));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'movies_color_is_hex') THEN
    ALTER TABLE public.movies ADD CONSTRAINT movies_color_is_hex CHECK (
      (poster_color IS NULL OR poster_color ~ '^#[0-9a-fA-F]{6}$') AND (banner_color IS NULL OR banner_color ~ '^#[0-9a-fA-F]{6}$'));
  END IF;
END $$;

-- 2. The record of uploads --------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id      uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('poster', 'banner')),
  original_path text NOT NULL,
  paths         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- storage path of each copy
  bytes         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- size of each copy
  src_width     int,
  src_height    int,
  crop          jsonb,                                -- { x, y, w, h } as fractions of the original
  focus         jsonb,                                -- { x, y } as fractions of the crop
  quality       int CHECK (quality IS NULL OR quality BETWEEN 40 AND 100),
  previous_url  text,                                 -- the link this replaced, for "remove the uploaded poster"
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  removed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_movie_images_movie ON public.movie_images (movie_id, kind, created_at DESC);

ALTER TABLE public.movie_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movie_images_admin_read" ON public.movie_images;
CREATE POLICY "movie_images_admin_read" ON public.movie_images FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "movie_images_admin_write" ON public.movie_images;
CREATE POLICY "movie_images_admin_write" ON public.movie_images FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Storage ----------------------------------------------------------------------------------------------------
-- Guarded, so this file also runs on a database without Supabase's storage schema.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('posters', 'posters', true, 15728640, ARRAY['image/webp', 'image/jpeg', 'image/png'])
    ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 15728640, allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "posters_public_read" ON storage.objects';
    EXECUTE 'CREATE POLICY "posters_public_read" ON storage.objects FOR SELECT USING (bucket_id = ''posters'')';
    EXECUTE 'DROP POLICY IF EXISTS "posters_admin_insert" ON storage.objects';
    EXECUTE 'CREATE POLICY "posters_admin_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''posters'' AND public.is_admin())';
    EXECUTE 'DROP POLICY IF EXISTS "posters_admin_update" ON storage.objects';
    EXECUTE 'CREATE POLICY "posters_admin_update" ON storage.objects FOR UPDATE USING (bucket_id = ''posters'' AND public.is_admin())';
    EXECUTE 'DROP POLICY IF EXISTS "posters_admin_delete" ON storage.objects';
    EXECUTE 'CREATE POLICY "posters_admin_delete" ON storage.objects FOR DELETE USING (bucket_id = ''posters'' AND public.is_admin())';
  END IF;
END $$;
