-- Decks: named, published sets of listed films that people can swipe through.
-- A "curated" deck is a hand-ordered list of films. A "mood" deck wraps one of the built-in
-- mood rules (for example Old but Gold) so it gets its own page, description and cover.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.decks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  description  text CHECK (description IS NULL OR char_length(description) <= 400),
  kind         text NOT NULL DEFAULT 'curated' CHECK (kind IN ('curated', 'mood')),
  mood_slug    text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured     boolean NOT NULL DEFAULT false,
  sponsor_name text CHECK (sponsor_name IS NULL OR char_length(btrim(sponsor_name)) BETWEEN 1 AND 80),
  sponsor_url  text CHECK (sponsor_url IS NULL OR sponsor_url ~* '^https?://'),
  sort_order   int NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  -- A mood deck needs its mood. A curated deck must not carry one.
  CONSTRAINT decks_mood_matches_kind CHECK ((kind = 'mood') = (mood_slug IS NOT NULL)),
  -- A sponsor link without a sponsor name would be an unlabelled ad.
  CONSTRAINT decks_sponsor_is_labelled CHECK (sponsor_url IS NULL OR sponsor_name IS NOT NULL)
);

COMMENT ON COLUMN public.decks.sponsor_name IS 'When set, every place the deck appears must show "Sponsored by <name>". Sponsorship never changes which films are eligible.';

CREATE INDEX IF NOT EXISTS idx_decks_status_order ON public.decks (status, featured DESC, sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS public.deck_items (
  deck_id  uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  position int  NOT NULL DEFAULT 0,
  note     text CHECK (note IS NULL OR char_length(note) <= 200),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deck_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_deck_items_order ON public.deck_items (deck_id, position);

-- Only listed films may be in a deck, whoever is asking and whether or not the deck is sponsored.
CREATE OR REPLACE FUNCTION public.enforce_deck_item_listed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.movies WHERE id = NEW.movie_id AND listing_status = 'approved') THEN
    RAISE EXCEPTION 'Only listed films can be added to a deck' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deck_items_listed_only ON public.deck_items;
CREATE TRIGGER deck_items_listed_only
  BEFORE INSERT OR UPDATE OF movie_id ON public.deck_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_deck_item_listed();

CREATE OR REPLACE FUNCTION public.decks_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decks_touch ON public.decks;
CREATE TRIGGER decks_touch
  BEFORE INSERT OR UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.decks_touch();

ALTER TABLE public.decks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decks_public_read" ON public.decks;
CREATE POLICY "decks_public_read" ON public.decks
  FOR SELECT USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "decks_admin_write" ON public.decks;
CREATE POLICY "decks_admin_write" ON public.decks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "deck_items_public_read" ON public.deck_items;
CREATE POLICY "deck_items_public_read" ON public.deck_items
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.decks d WHERE d.id = deck_id AND d.status = 'published')
  );

DROP POLICY IF EXISTS "deck_items_admin_write" ON public.deck_items;
CREATE POLICY "deck_items_admin_write" ON public.deck_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
