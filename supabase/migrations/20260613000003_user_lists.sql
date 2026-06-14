-- User-created shareable movie lists

CREATE TABLE IF NOT EXISTS public.movie_lists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_public   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movie_list_items (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id  UUID NOT NULL REFERENCES public.movie_lists(id) ON DELETE CASCADE,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT movie_list_items_unique UNIQUE (list_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_lists_user    ON public.movie_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_list_items_list  ON public.movie_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_movie_list_items_movie ON public.movie_list_items(movie_id);

ALTER TABLE public.movie_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_list_items ENABLE ROW LEVEL SECURITY;

-- movie_lists policies
DROP POLICY IF EXISTS "Public lists are viewable by everyone" ON public.movie_lists;
DROP POLICY IF EXISTS "Users can view own private lists"      ON public.movie_lists;
DROP POLICY IF EXISTS "Users can create lists"                ON public.movie_lists;
DROP POLICY IF EXISTS "Users can update own lists"            ON public.movie_lists;
DROP POLICY IF EXISTS "Users can delete own lists"            ON public.movie_lists;

CREATE POLICY "Public lists are viewable by everyone"
  ON public.movie_lists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create lists"
  ON public.movie_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON public.movie_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON public.movie_lists FOR DELETE
  USING (auth.uid() = user_id);

-- movie_list_items policies
DROP POLICY IF EXISTS "Items of public lists viewable by all" ON public.movie_list_items;
DROP POLICY IF EXISTS "Users can add to own lists"            ON public.movie_list_items;
DROP POLICY IF EXISTS "Users can remove from own lists"       ON public.movie_list_items;

CREATE POLICY "Items of public lists viewable by all"
  ON public.movie_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.movie_lists
      WHERE id = movie_list_items.list_id
      AND (is_public = true OR user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add to own lists"
  ON public.movie_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.movie_lists
      WHERE id = movie_list_items.list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from own lists"
  ON public.movie_list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.movie_lists
      WHERE id = movie_list_items.list_id AND user_id = auth.uid()
    )
  );
