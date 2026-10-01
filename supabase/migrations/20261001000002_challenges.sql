-- Challenges: a time-boxed goal built on a Deck.
-- "Take N of these films before the window closes." Progress is a take (reaction or review) saved
-- on a listed film in the deck while the window is open. Completions are awarded by the database,
-- not by the browser, and each one gets a share card so the person can show it off.
-- Two kinds: 'deck' (take N films from the deck) and 'club_paired' (the same, plus the Club film).
-- Safe to run more than once. Needs 20261001000001_decks.sql first.

CREATE TABLE IF NOT EXISTS public.challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  description   text CHECK (description IS NULL OR char_length(description) <= 400),
  kind          text NOT NULL DEFAULT 'deck' CHECK (kind IN ('deck', 'club_paired')),
  deck_id       uuid NOT NULL REFERENCES public.decks(id) ON DELETE RESTRICT,
  club_cycle_id uuid REFERENCES public.club_cycles(id) ON DELETE RESTRICT,
  goal          int  NOT NULL CHECK (goal BETWEEN 1 AND 50),
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured      boolean NOT NULL DEFAULT false,
  sponsor_name  text CHECK (sponsor_name IS NULL OR char_length(btrim(sponsor_name)) BETWEEN 1 AND 80),
  sponsor_url   text CHECK (sponsor_url IS NULL OR sponsor_url ~* '^https?://'),
  sort_order    int NOT NULL DEFAULT 0,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz,
  CONSTRAINT challenges_window_valid CHECK (ends_at > starts_at AND ends_at <= starts_at + interval '120 days'),
  CONSTRAINT challenges_club_matches_kind CHECK ((kind = 'club_paired') = (club_cycle_id IS NOT NULL)),
  CONSTRAINT challenges_sponsor_is_labelled CHECK (sponsor_url IS NULL OR sponsor_name IS NOT NULL)
);

COMMENT ON COLUMN public.challenges.sponsor_name IS 'When set, every place the challenge appears shows "Sponsored by <name>". Sponsorship never changes which films qualify.';

CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges (status, featured DESC, ends_at);
CREATE INDEX IF NOT EXISTS idx_challenges_deck   ON public.challenges (deck_id);

CREATE TABLE IF NOT EXISTS public.challenge_joins (
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_joins_user ON public.challenge_joins (user_id);

CREATE TABLE IF NOT EXISTS public.challenge_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user ON public.challenge_completions (user_id, completed_at DESC);

-- A challenge is only as good as its deck ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.challenges_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deck_kind text;
  deck_status text;
  listed int;
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := now();
  END IF;

  SELECT kind, status INTO deck_kind, deck_status FROM public.decks WHERE id = NEW.deck_id;
  IF deck_kind IS DISTINCT FROM 'curated' THEN
    RAISE EXCEPTION 'A challenge needs a hand-picked deck' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'published' THEN
    IF deck_status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION 'Publish the deck before publishing a challenge built on it' USING ERRCODE = '23514';
    END IF;
    SELECT count(*) INTO listed
    FROM public.deck_items di JOIN public.movies m ON m.id = di.movie_id
    WHERE di.deck_id = NEW.deck_id AND m.listing_status = 'approved';
    IF listed < NEW.goal THEN
      RAISE EXCEPTION 'The deck has % listed films, fewer than the goal of %', listed, NEW.goal USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenges_validate ON public.challenges;
CREATE TRIGGER challenges_validate
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.challenges_validate();

-- Joining: only published challenges that have not ended -------------------------------------
CREATE OR REPLACE FUNCTION public.challenge_joins_open_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.challenges%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = NEW.challenge_id;
  IF NOT FOUND OR c.status <> 'published' THEN
    RAISE EXCEPTION 'That challenge is not open' USING ERRCODE = '23514';
  END IF;
  IF now() > c.ends_at THEN
    RAISE EXCEPTION 'That challenge has ended' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenge_joins_open_only ON public.challenge_joins;
CREATE TRIGGER challenge_joins_open_only
  BEFORE INSERT ON public.challenge_joins
  FOR EACH ROW EXECUTE FUNCTION public.challenge_joins_open_only();

-- Awarding completions ------------------------------------------------------------------------
-- Counts the distinct listed deck films the person has a take on, saved while the window was
-- open. A take saved before the window, or edited into it, does not count. Completions stay
-- even if a take is later removed.
CREATE OR REPLACE FUNCTION public.evaluate_challenges(p_user uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.challenges%ROWTYPE;
  done_films int;
  club_ok boolean;
  comp_id uuid;
  awarded int := 0;
BEGIN
  FOR c IN
    SELECT ch.*
    FROM public.challenge_joins j
    JOIN public.challenges ch ON ch.id = j.challenge_id
    WHERE j.user_id = p_user
      AND ch.status = 'published'
      AND now() BETWEEN ch.starts_at AND ch.ends_at
      AND NOT EXISTS (SELECT 1 FROM public.challenge_completions x WHERE x.challenge_id = ch.id AND x.user_id = p_user)
  LOOP
    SELECT count(DISTINCT t.movie_id) INTO done_films
    FROM public.takes t
    JOIN public.deck_items di ON di.movie_id = t.movie_id AND di.deck_id = c.deck_id
    JOIN public.movies m ON m.id = di.movie_id AND m.listing_status = 'approved'
    WHERE t.user_id = p_user AND t.created_at BETWEEN c.starts_at AND c.ends_at;

    club_ok := c.club_cycle_id IS NULL OR EXISTS (
      SELECT 1
      FROM public.club_cycles cc
      JOIN public.takes t ON t.movie_id = cc.movie_id
      WHERE cc.id = c.club_cycle_id AND t.user_id = p_user AND t.created_at BETWEEN c.starts_at AND c.ends_at
    );

    IF done_films >= c.goal AND club_ok THEN
      INSERT INTO public.challenge_completions (challenge_id, user_id)
      VALUES (c.id, p_user)
      ON CONFLICT (challenge_id, user_id) DO NOTHING
      RETURNING id INTO comp_id;

      IF comp_id IS NOT NULL THEN
        -- The laurel's share card is made at the moment of completion.
        INSERT INTO public.share_cards (object_type, object_id, user_id, share_token)
        VALUES ('challenge', comp_id, p_user, substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
        ON CONFLICT DO NOTHING;
        awarded := awarded + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN awarded;
END;
$$;

-- Supabase grants new functions to anon and authenticated by default, so revoke those as well.
-- Only the triggers below (which run as the function owner) should ever award a completion.
REVOKE ALL ON FUNCTION public.evaluate_challenges(uuid) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.evaluate_challenges(uuid) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.evaluate_challenges(uuid) FROM authenticated;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.challenges_after_take()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' THEN
    PERFORM public.evaluate_challenges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenges_after_take ON public.movie_reactions;
CREATE TRIGGER challenges_after_take
  AFTER INSERT OR UPDATE ON public.movie_reactions
  FOR EACH ROW EXECUTE FUNCTION public.challenges_after_take();

-- Joining late still counts takes already saved inside the window.
CREATE OR REPLACE FUNCTION public.challenges_after_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.evaluate_challenges(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS challenges_after_join ON public.challenge_joins;
CREATE TRIGGER challenges_after_join
  AFTER INSERT ON public.challenge_joins
  FOR EACH ROW EXECUTE FUNCTION public.challenges_after_join();

-- Access ---------------------------------------------------------------------------------------
ALTER TABLE public.challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_joins       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenges_public_read" ON public.challenges;
CREATE POLICY "challenges_public_read" ON public.challenges
  FOR SELECT USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "challenges_admin_write" ON public.challenges;
CREATE POLICY "challenges_admin_write" ON public.challenges
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "challenge_joins_own_read" ON public.challenge_joins;
CREATE POLICY "challenge_joins_own_read" ON public.challenge_joins
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "challenge_joins_own_insert" ON public.challenge_joins;
CREATE POLICY "challenge_joins_own_insert" ON public.challenge_joins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_joins_own_delete" ON public.challenge_joins;
CREATE POLICY "challenge_joins_own_delete" ON public.challenge_joins
  FOR DELETE USING (auth.uid() = user_id);

-- Completions are public: a laurel is meant to be seen. Only the database writes them.
DROP POLICY IF EXISTS "challenge_completions_public_read" ON public.challenge_completions;
CREATE POLICY "challenge_completions_public_read" ON public.challenge_completions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "challenge_completions_admin_write" ON public.challenge_completions;
CREATE POLICY "challenge_completions_admin_write" ON public.challenge_completions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
