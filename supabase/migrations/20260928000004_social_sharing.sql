-- Social sharing: star rating + share cards + share events

-- 1. Add star rating column to movie_reactions
ALTER TABLE movie_reactions
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 2. Review share cards — one card per reaction, created on first save
CREATE TABLE IF NOT EXISTS review_share_cards (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  reaction_id  UUID    NOT NULL REFERENCES movie_reactions(id) ON DELETE CASCADE,
  user_id      UUID    NOT NULL,
  movie_id     UUID    NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  share_token  TEXT    NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rsc_reaction_unique ON review_share_cards(reaction_id);
CREATE INDEX        IF NOT EXISTS idx_rsc_token           ON review_share_cards(share_token);

ALTER TABLE review_share_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsc_public_read"  ON review_share_cards FOR SELECT USING (true);
CREATE POLICY "rsc_owner_write"  ON review_share_cards FOR ALL    USING (auth.uid() = user_id);

-- 3. Share events — destination click tracking (WhatsApp / copy / save / native)
CREATE TABLE IF NOT EXISTS share_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_card_id UUID REFERENCES review_share_cards(id) ON DELETE SET NULL,
  user_id       UUID,
  destination   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "se_insert_open" ON share_events FOR INSERT WITH CHECK (true);
