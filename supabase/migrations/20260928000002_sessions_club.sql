-- swipe_sessions: per-user per-session analytics
CREATE TABLE IF NOT EXISTS swipe_sessions (
  id                UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ  DEFAULT now() NOT NULL,
  ended_at          TIMESTAMPTZ,
  cards_presented   INT          NOT NULL DEFAULT 0,
  seen_count        INT          NOT NULL DEFAULT 0,
  unseen_count      INT          NOT NULL DEFAULT 0,
  reaction_count    INT          NOT NULL DEFAULT 0,
  watch_later_count INT          NOT NULL DEFAULT 0
);

ALTER TABLE swipe_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swipe_sessions_own" ON swipe_sessions
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- club_participation: per-user per-movie watching status
CREATE TABLE IF NOT EXISTS club_participation (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id     UUID         REFERENCES movies(id) ON DELETE CASCADE NOT NULL,
  status       TEXT         NOT NULL CHECK (status IN ('interested','watching','completed')),
  joined_at    TIMESTAMPTZ  DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, movie_id)
);

ALTER TABLE club_participation ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for counting participants — no PII returned)
CREATE POLICY "club_participation_read_all" ON club_participation
  FOR SELECT USING (true);

CREATE POLICY "club_participation_own_insert" ON club_participation
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "club_participation_own_update" ON club_participation
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "club_participation_own_delete" ON club_participation
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast participant count per movie
CREATE INDEX IF NOT EXISTS idx_club_participation_movie ON club_participation (movie_id);
CREATE INDEX IF NOT EXISTS idx_club_participation_user  ON club_participation (user_id);
