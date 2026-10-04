-- MuvieStars Awards, slice 3b: corrections, laurel access.
--
-- Rules this migration holds to (Awards spec sections 33 to 35 and 53):
--   * A published award is never rewritten in silence. Putting it under review, upholding it, correcting it or
--     revoking it each leave a public note on the record and a private reason in the audit log.
--   * A correction does not edit the old record. The old verification code stays, marked corrected, and points to
--     the record that replaced it. The replacement gets its own code and its own story.
--   * Full laurel packs are for award administrators and the account that got the film listed. Everyone else
--     can look at a preview. The database decides who is allowed, so the page and the file route cannot disagree.
-- Safe to run more than once. Needs migrations 4, 5 and 6 first.

-- 1. Record fields ---------------------------------------------------------------------------------------------
ALTER TABLE public.award_recognition
  ADD COLUMN IF NOT EXISTS status_note       text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_status   text,
  ADD COLUMN IF NOT EXISTS superseded_by     uuid REFERENCES public.award_recognition(id),
  ADD COLUMN IF NOT EXISTS replaces          uuid REFERENCES public.award_recognition(id);

-- What the public sees on a record's page as its history. Written only by the functions below.
CREATE TABLE IF NOT EXISTS public.award_recognition_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recognition_id uuid NOT NULL REFERENCES public.award_recognition(id) ON DELETE RESTRICT,
  event          text NOT NULL CHECK (event IN ('review_opened', 'upheld', 'corrected', 'revoked', 'story_edited')),
  public_note    text NOT NULL CHECK (char_length(btrim(public_note)) >= 10),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_award_recognition_events ON public.award_recognition_events (recognition_id, created_at);

DROP TRIGGER IF EXISTS award_events_immutable ON public.award_recognition_events;
CREATE TRIGGER award_events_immutable
  BEFORE UPDATE OR DELETE ON public.award_recognition_events
  FOR EACH ROW EXECUTE FUNCTION public.award_audit_immutable();

-- Who downloaded a production laurel, and when (spec analytics: award_laurel_downloaded).
CREATE TABLE IF NOT EXISTS public.award_laurel_downloads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recognition_id uuid NOT NULL REFERENCES public.award_recognition(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role           text NOT NULL CHECK (role IN ('admin', 'rights_holder')),
  variant        text NOT NULL,
  format         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_award_laurel_downloads ON public.award_laurel_downloads (recognition_id, created_at DESC);

ALTER TABLE public.award_recognition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_laurel_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "award_recognition_events_read" ON public.award_recognition_events;
CREATE POLICY "award_recognition_events_read" ON public.award_recognition_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "award_laurel_downloads_admin" ON public.award_laurel_downloads;
CREATE POLICY "award_laurel_downloads_admin" ON public.award_laurel_downloads FOR SELECT USING (public.is_admin());

-- 2. Verification codes ----------------------------------------------------------------------------------------
-- Same format as publishing: MS-YYYY-MM-<category initials>-<5 characters that cannot be misread>.
CREATE OR REPLACE FUNCTION public.award_make_code(p_cycle uuid, p_category uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.award_cycles%ROWTYPE;
  k public.award_categories%ROWTYPE;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_initials text;
  v_code text;
  v_tries int := 0;
BEGIN
  SELECT * INTO c FROM public.award_cycles WHERE id = p_cycle;
  SELECT * INTO k FROM public.award_categories WHERE id = p_category;
  SELECT string_agg(upper(left(part, 1)), '') INTO v_initials FROM unnest(string_to_array(k.slug, '-')) AS part;
  LOOP
    v_code := 'MS-' || c.slug || '-' || v_initials || '-' || (
      SELECT string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '') FROM generate_series(1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.award_recognition WHERE verification_code = v_code);
    v_tries := v_tries + 1;
    IF v_tries > 20 THEN RAISE EXCEPTION 'Could not make a unique verification code'; END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 3. Corrections -----------------------------------------------------------------------------------------------
-- Step 1: put a published honour under review. It stays visible, with a note, while someone checks.
CREATE OR REPLACE FUNCTION public.award_open_recognition_review(p_recognition uuid, p_reason text, p_public_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.award_recognition%ROWTYPE;
  v_note text := coalesce(nullif(btrim(p_public_note), ''), 'The result is being checked. This page will explain what was found.');
BEGIN
  PERFORM public.award_require_admin();
  IF char_length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why this honour is being reviewed, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO r FROM public.award_recognition WHERE id = p_recognition FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That honour does not exist' USING ERRCODE = '23514'; END IF;
  IF r.status NOT IN ('valid', 'corrected') OR r.superseded_by IS NOT NULL THEN
    RAISE EXCEPTION 'Only a current honour can be put under review' USING ERRCODE = '23514';
  END IF;

  UPDATE public.award_recognition
    SET status = 'under_review', previous_status = r.status, status_note = v_note, status_changed_at = now()
    WHERE id = r.id;
  INSERT INTO public.award_recognition_events (recognition_id, event, public_note) VALUES (r.id, 'review_opened', v_note);
  PERFORM public.award_log('recognition_review_opened', 'award_recognition', r.id,
    jsonb_build_object('status', r.status), jsonb_build_object('status', 'under_review'), p_reason);
END;
$$;

-- Step 2: close the review. The honour is upheld, revoked, or corrected to a different nominee.
-- Returns the id of the record that now stands (a new one when it was corrected).
CREATE OR REPLACE FUNCTION public.award_resolve_recognition_review(
  p_recognition uuid, p_outcome text, p_reason text, p_public_note text,
  p_new_nominee uuid DEFAULT NULL, p_new_story text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.award_recognition%ROWTYPE;
  n public.award_nominees%ROWTYPE;
  c public.award_cycles%ROWTYPE;
  v_note text := nullif(btrim(coalesce(p_public_note, '')), '');
  v_new uuid;
  v_code text;
  v_story text := nullif(btrim(coalesce(p_new_story, '')), '');
  v_old_story text;
BEGIN
  PERFORM public.award_require_admin();
  IF p_outcome NOT IN ('upheld', 'revoked', 'corrected') THEN
    RAISE EXCEPTION 'A review ends as upheld, revoked or corrected' USING ERRCODE = '23514';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO r FROM public.award_recognition WHERE id = p_recognition FOR UPDATE;
  IF NOT FOUND OR r.status <> 'under_review' THEN
    RAISE EXCEPTION 'Open a review first. Only an honour under review can be resolved' USING ERRCODE = '23514';
  END IF;
  IF p_outcome <> 'upheld' AND (v_note IS NULL OR char_length(v_note) < 20) THEN
    RAISE EXCEPTION 'Write what the public should read about this, at least 20 characters. It goes on the honour''s page' USING ERRCODE = '23514';
  END IF;
  v_note := coalesce(v_note, 'The review is finished and the honour stands.');

  IF p_outcome = 'upheld' THEN
    UPDATE public.award_recognition
      SET status = coalesce(previous_status, 'valid'), status_note = v_note, status_changed_at = now(), previous_status = NULL
      WHERE id = r.id;
    INSERT INTO public.award_recognition_events (recognition_id, event, public_note) VALUES (r.id, 'upheld', v_note);
    PERFORM public.award_log('recognition_upheld', 'award_recognition', r.id,
      jsonb_build_object('status', 'under_review'), jsonb_build_object('status', coalesce(r.previous_status, 'valid')), p_reason);
    RETURN r.id;
  END IF;

  IF p_outcome = 'revoked' THEN
    UPDATE public.award_recognition
      SET status = 'revoked', status_note = v_note, status_changed_at = now(), previous_status = NULL
      WHERE id = r.id;
    UPDATE public.award_nominees SET status = 'approved'
      WHERE cycle_id = r.cycle_id AND category_id = r.category_id AND subject_type = r.subject_type AND subject_id = r.subject_id AND status = 'winner';
    INSERT INTO public.award_recognition_events (recognition_id, event, public_note) VALUES (r.id, 'revoked', v_note);
    PERFORM public.award_log('recognition_revoked', 'award_recognition', r.id,
      jsonb_build_object('status', 'under_review'), jsonb_build_object('status', 'revoked'), p_reason);
    RETURN r.id;
  END IF;

  -- corrected: a different nominee from the same shortlist is the winner.
  IF p_new_nominee IS NULL THEN
    RAISE EXCEPTION 'Pick the nominee who should have won' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO n FROM public.award_nominees WHERE id = p_new_nominee;
  IF NOT FOUND OR n.cycle_id <> r.cycle_id OR n.category_id <> r.category_id THEN
    RAISE EXCEPTION 'The corrected winner has to be a nominee from this same shortlist' USING ERRCODE = '23514';
  END IF;
  IF n.subject_type = r.subject_type AND n.subject_id = r.subject_id THEN
    RAISE EXCEPTION 'That is the nominee who already holds the honour. Uphold the review instead' USING ERRCODE = '23514';
  END IF;
  IF n.status NOT IN ('approved', 'runner_up') THEN
    RAISE EXCEPTION 'The corrected winner has to be a nominee from this same shortlist' USING ERRCODE = '23514';
  END IF;
  IF v_story IS NULL OR char_length(v_story) < 80 THEN
    RAISE EXCEPTION 'The new winner needs a story of at least 80 characters' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO c FROM public.award_cycles WHERE id = r.cycle_id;

  v_code := public.award_make_code(r.cycle_id, r.category_id);
  INSERT INTO public.award_recognition (cycle_id, category_id, subject_type, subject_id, recognition_type, title, description, verification_code, status, awarded_at, replaces, status_note, status_changed_at)
  VALUES (r.cycle_id, r.category_id, n.subject_type, n.subject_id, 'winner', r.title, v_story, v_code, 'valid', now(), r.id,
          'Issued as a correction. The earlier result for this honour was withdrawn: ' || v_note, now())
  RETURNING id INTO v_new;

  UPDATE public.award_recognition
    SET status = 'corrected', superseded_by = v_new, status_note = v_note, status_changed_at = now(), previous_status = NULL
    WHERE id = r.id;
  UPDATE public.award_nominees SET status = 'approved'
    WHERE cycle_id = r.cycle_id AND category_id = r.category_id AND subject_type = r.subject_type AND subject_id = r.subject_id AND status = 'winner';
  UPDATE public.award_nominees SET status = 'winner' WHERE id = n.id;

  SELECT story INTO v_old_story FROM public.award_cycle_categories WHERE cycle_id = r.cycle_id AND category_id = r.category_id;
  UPDATE public.award_cycle_categories SET story = v_story WHERE cycle_id = r.cycle_id AND category_id = r.category_id;

  INSERT INTO public.award_recognition_events (recognition_id, event, public_note) VALUES (r.id, 'corrected', v_note);
  INSERT INTO public.award_recognition_events (recognition_id, event, public_note) VALUES (v_new, 'corrected', 'Issued as a correction of ' || r.verification_code || '. ' || v_note);
  PERFORM public.award_log('recognition_corrected', 'award_recognition', r.id,
    jsonb_build_object('status', 'under_review', 'subject_type', r.subject_type, 'subject_id', r.subject_id, 'story', v_old_story),
    jsonb_build_object('status', 'corrected', 'replaced_by', v_new, 'subject_type', n.subject_type, 'subject_id', n.subject_id), p_reason);
  RETURN v_new;
END;
$$;

-- A wording fix to a story that is already public. The honour stays valid, and the page says the story was edited.
CREATE OR REPLACE FUNCTION public.award_correct_recognition_story(p_recognition uuid, p_story text, p_reason text, p_public_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.award_recognition%ROWTYPE;
  v_story text := nullif(btrim(coalesce(p_story, '')), '');
  v_note text := nullif(btrim(coalesce(p_public_note, '')), '');
BEGIN
  PERFORM public.award_require_admin();
  IF char_length(btrim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'Say why, in a few words. The reason is kept in the record of changes' USING ERRCODE = '23514';
  END IF;
  IF v_note IS NULL OR char_length(v_note) < 10 THEN
    RAISE EXCEPTION 'Say what changed, for the public note on the page' USING ERRCODE = '23514';
  END IF;
  IF v_story IS NULL OR char_length(v_story) < 80 THEN
    RAISE EXCEPTION 'A story needs at least 80 characters' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO r FROM public.award_recognition WHERE id = p_recognition FOR UPDATE;
  IF NOT FOUND OR r.status NOT IN ('valid', 'corrected') OR r.superseded_by IS NOT NULL THEN
    RAISE EXCEPTION 'Only a current honour has a story that can be edited' USING ERRCODE = '23514';
  END IF;

  UPDATE public.award_recognition SET description = v_story WHERE id = r.id;
  UPDATE public.award_cycle_categories SET story = v_story WHERE cycle_id = r.cycle_id AND category_id = r.category_id;
  INSERT INTO public.award_recognition_events (recognition_id, event, public_note) VALUES (r.id, 'story_edited', v_note);
  PERFORM public.award_log('recognition_story_edited', 'award_recognition', r.id,
    jsonb_build_object('story', r.description), jsonb_build_object('story', v_story), p_reason);
END;
$$;

-- 4. Laurel access --------------------------------------------------------------------------------------------
-- Returns 'admin', 'rights_holder' or NULL. Administrators always; the account that got the film listed, while
-- the honour is valid. A revoked, corrected or under-review honour cannot have new packs downloaded by anyone else.
CREATE OR REPLACE FUNCTION public.award_laurel_access(p_code text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.award_recognition%ROWTYPE;
  v_movie uuid;
BEGIN
  SELECT * INTO r FROM public.award_recognition WHERE verification_code = p_code;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF public.is_admin() THEN RETURN 'admin'; END IF;
  IF auth.uid() IS NULL OR r.status <> 'valid' THEN RETURN NULL; END IF;

  IF r.subject_type = 'movie' THEN
    v_movie := r.subject_id;
  ELSE
    SELECT movie_id INTO v_movie FROM public.movie_people WHERE id = r.subject_id;
  END IF;
  IF v_movie IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.movie_listing_submissions s
    WHERE s.user_id = auth.uid() AND s.status = 'accepted' AND s.movie_id = v_movie
  ) THEN
    RETURN 'rights_holder';
  END IF;
  RETURN NULL;
END;
$$;

-- The file route calls this before it hands over a production file. It checks access and keeps the log.
CREATE OR REPLACE FUNCTION public.award_authorise_laurel_download(p_code text, p_variant text, p_format text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.award_laurel_access(p_code);
  v_id uuid;
BEGIN
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Production laurels are for award administrators and the account that got this film listed' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_id FROM public.award_recognition WHERE verification_code = p_code;
  INSERT INTO public.award_laurel_downloads (recognition_id, user_id, role, variant, format)
  VALUES (v_id, auth.uid(), v_role, left(coalesce(p_variant, ''), 20), left(coalesce(p_format, ''), 20));
  RETURN v_role;
END;
$$;

-- 5. Public signals --------------------------------------------------------------------------------------------
-- The two plain counts a winner's page can show without exposing a score: how many qualified takes the film
-- had that month and how many different people wrote them. Never a weighted figure, never a rank.
CREATE OR REPLACE FUNCTION public.award_public_signals(p_recognition uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
           'takes', (res.components -> 'raw' ->> 'qualified_takes')::int,
           'reviewers', (res.components -> 'raw' ->> 'unique_reviewers')::int)
  FROM public.award_recognition r
  JOIN public.award_nominees n
    ON n.cycle_id = r.cycle_id AND n.category_id = r.category_id AND n.subject_type = r.subject_type AND n.subject_id = r.subject_id
  JOIN public.award_results res ON res.nominee_id = n.id
  WHERE r.id = p_recognition
    AND res.published_at IS NOT NULL
    AND res.components -> 'raw' ? 'qualified_takes'
    AND res.components -> 'raw' ? 'unique_reviewers'
  LIMIT 1
$$;

-- 6. Grants ---------------------------------------------------------------------------------------------------
-- Supabase hands new functions to anon and authenticated by default. Writes here are administrators only.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'award_open_recognition_review(uuid,text,text)',
    'award_resolve_recognition_review(uuid,text,text,text,uuid,text)',
    'award_correct_recognition_story(uuid,text,text,text)',
    'award_authorise_laurel_download(text,text,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', f);
    END IF;
  END LOOP;
  -- Code generation is an internal of the functions above.
  EXECUTE 'REVOKE ALL ON FUNCTION public.award_make_code(uuid,uuid) FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_make_code(uuid,uuid) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.award_make_code(uuid,uuid) FROM authenticated';
  END IF;
END $$;
