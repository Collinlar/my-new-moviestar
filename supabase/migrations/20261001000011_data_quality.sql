-- MuvieStars: catalogue data cleanup.
--
-- Three things:
--   1. industry_for(country, language): the one place that says which industry a country belongs to. It is the
--      same rule the June 2026 migration used, now a function, so it can be reused instead of copied.
--   2. A trigger that keeps industry in step with country. Until now industry was filled once, in June, from
--      whatever country a film had then. A country added later (every film fixed in the listing queue) left
--      industry on 'Other', which hides the film from Nollywood and Ghallywood moods and from taste matching.
--      The trigger only fills industry when it is empty or 'Other', so a deliberate choice is never overridden.
--   3. data_quality_apply / data_quality_undo: bulk fixes from the Data quality screen. Every change is logged with
--      its old value, grouped in a batch, and a batch can be undone. A change only lands if the film still has
--      the value the editor saw, so two editors cannot overwrite each other without knowing.
-- Safe to run more than once. Needs the movies table (and its language and industry columns).

-- 1. Industry rule ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.industry_for(p_country text, p_language text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_country = 'Nigeria' AND lower(coalesce(p_language, '')) = 'yoruba' THEN 'Nollywood Yoruba'
    WHEN p_country = 'Nigeria'                                              THEN 'Nollywood'
    WHEN p_country = 'Ghana'                                                THEN 'Ghallywood'
    WHEN p_country = 'Uganda'                                               THEN 'Wakaliwood'
    WHEN lower(coalesce(p_language, '')) = 'french'
      OR p_country IN ('Senegal', 'Côte d''Ivoire', 'Ivory Coast', 'Cameroon', 'Democratic Republic of Congo', 'DRC',
                       'Mali', 'Burkina Faso', 'Guinea', 'Togo', 'Benin', 'Madagascar', 'Rwanda')
                                                                            THEN 'Francophone'
    WHEN p_country = 'South Africa'                                         THEN 'South African'
    WHEN p_country IN ('Kenya', 'Tanzania', 'Ethiopia')                     THEN 'East African'
    WHEN p_country IN ('Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Libya')   THEN 'North African'
    ELSE 'Other'
  END
$$;

-- 2. Keep industry in step with country -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.movies_sync_industry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.industry IS NULL OR NEW.industry = 'Other' THEN
    NEW.industry := public.industry_for(NEW.country, NEW.language);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS movies_sync_industry ON public.movies;
CREATE TRIGGER movies_sync_industry
  BEFORE INSERT OR UPDATE OF country, language ON public.movies
  FOR EACH ROW EXECUTE FUNCTION public.movies_sync_industry();

-- 3. The change log ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_data_changes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq         bigserial,
  batch_id    uuid NOT NULL,
  movie_id    uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  field       text NOT NULL CHECK (field IN ('title', 'country', 'release_year', 'industry')),
  old_value   text,
  new_value   text NOT NULL,
  note        text,
  changed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  reverted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_movie_data_changes_batch ON public.movie_data_changes (batch_id, seq);
CREATE INDEX IF NOT EXISTS idx_movie_data_changes_movie ON public.movie_data_changes (movie_id, created_at DESC);

ALTER TABLE public.movie_data_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movie_data_changes_admin" ON public.movie_data_changes;
CREATE POLICY "movie_data_changes_admin" ON public.movie_data_changes FOR SELECT USING (public.is_admin());

-- 4. Apply ------------------------------------------------------------------------------------------------------
-- p_changes: [{ "id": "<film id>", "field": "title|country|release_year|industry", "from": "<what the editor saw>", "to": "<new value>" }]
CREATE OR REPLACE FUNCTION public.data_quality_apply(p_changes jsonb, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c jsonb;
  v_batch uuid := gen_random_uuid();
  v_applied int := 0;
  v_skipped int := 0;
  v_id uuid;
  v_field text;
  v_from text;
  v_to text;
  v_cur text;
  v_year int;
  v_ind_before text;
  v_ind_after text;
  v_found boolean;
  v_industries text[] := ARRAY['Nollywood', 'Ghallywood', 'Nollywood Yoruba', 'Francophone', 'South African', 'East African',
                               'North African', 'Wakaliwood', 'Diaspora', 'Other'];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change film details in bulk' USING ERRCODE = '42501';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' OR jsonb_array_length(p_changes) = 0 THEN
    RAISE EXCEPTION 'Pick at least one change' USING ERRCODE = '23514';
  END IF;
  IF jsonb_array_length(p_changes) > 500 THEN
    RAISE EXCEPTION 'Apply 500 changes or fewer at a time' USING ERRCODE = '23514';
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    IF coalesce(c ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'One of those film ids is not valid' USING ERRCODE = '23514';
    END IF;
    v_id := (c ->> 'id')::uuid;
    v_field := c ->> 'field';
    v_from := nullif(btrim(coalesce(c ->> 'from', '')), '');
    v_to := nullif(btrim(coalesce(c ->> 'to', '')), '');

    IF v_field NOT IN ('title', 'country', 'release_year', 'industry') THEN
      RAISE EXCEPTION 'That field cannot be changed here' USING ERRCODE = '23514';
    END IF;
    IF v_to IS NULL THEN
      RAISE EXCEPTION 'Every change needs a new value' USING ERRCODE = '23514';
    END IF;
    IF v_field = 'title' AND char_length(v_to) > 200 THEN
      RAISE EXCEPTION 'A title can be 200 characters at most' USING ERRCODE = '23514';
    END IF;
    IF v_field = 'country' AND char_length(v_to) > 60 THEN
      RAISE EXCEPTION 'A country name can be 60 characters at most' USING ERRCODE = '23514';
    END IF;
    IF v_field = 'release_year' THEN
      IF v_to !~ '^\d{4}$' THEN RAISE EXCEPTION 'A release year is four digits' USING ERRCODE = '23514'; END IF;
      v_year := v_to::int;
      IF v_year < 1900 OR v_year > extract(year FROM now())::int + 2 THEN
        RAISE EXCEPTION 'A release year has to be between 1900 and %', extract(year FROM now())::int + 2 USING ERRCODE = '23514';
      END IF;
    END IF;
    IF v_field = 'industry' AND NOT (v_to = ANY (v_industries)) THEN
      RAISE EXCEPTION '% is not an industry on this site', v_to USING ERRCODE = '23514';
    END IF;

    SELECT true,
           CASE v_field WHEN 'title' THEN title WHEN 'country' THEN country WHEN 'release_year' THEN release_year::text ELSE industry END,
           industry
      INTO v_found, v_cur, v_ind_before
      FROM public.movies WHERE id = v_id;
    -- The film is gone, or somebody changed this field since the editor looked: leave it alone.
    IF NOT coalesce(v_found, false) OR coalesce(btrim(v_cur), '') IS DISTINCT FROM coalesce(v_from, '') THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- One column per statement: the industry trigger fires on any update that names country, so naming only the
    -- column being fixed keeps a title fix from touching the industry.
    IF v_field = 'title' THEN UPDATE public.movies SET title = v_to WHERE id = v_id;
    ELSIF v_field = 'country' THEN UPDATE public.movies SET country = v_to WHERE id = v_id;
    ELSIF v_field = 'release_year' THEN UPDATE public.movies SET release_year = v_to::int WHERE id = v_id;
    ELSE UPDATE public.movies SET industry = v_to WHERE id = v_id;
    END IF;

    INSERT INTO public.movie_data_changes (batch_id, movie_id, field, old_value, new_value, note, changed_by)
    VALUES (v_batch, v_id, v_field, v_cur, v_to, nullif(btrim(coalesce(p_note, '')), ''), auth.uid());

    -- A new country can move the industry along with it (see the trigger). Log that too, so undo puts it back.
    SELECT industry INTO v_ind_after FROM public.movies WHERE id = v_id;
    IF v_field <> 'industry' AND v_ind_after IS DISTINCT FROM v_ind_before THEN
      INSERT INTO public.movie_data_changes (batch_id, movie_id, field, old_value, new_value, note, changed_by)
      VALUES (v_batch, v_id, 'industry', v_ind_before, v_ind_after, 'Followed the country', auth.uid());
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  RETURN jsonb_build_object('batch', v_batch, 'applied', v_applied, 'skipped', v_skipped);
END;
$$;

-- 5. Undo -------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.data_quality_undo(p_batch uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_cur text;
  v_restored int := 0;
  v_skipped int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can undo a batch' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.movie_data_changes WHERE batch_id = p_batch) THEN
    RAISE EXCEPTION 'There is no such batch' USING ERRCODE = '23514';
  END IF;

  -- Newest change first, so a country and the industry that followed it come back in the right order.
  FOR r IN SELECT * FROM public.movie_data_changes WHERE batch_id = p_batch AND reverted_at IS NULL ORDER BY seq DESC LOOP
    SELECT CASE r.field WHEN 'title' THEN title WHEN 'country' THEN country WHEN 'release_year' THEN release_year::text ELSE industry END
      INTO v_cur FROM public.movies WHERE id = r.movie_id;
    -- Only put it back if the film still has what this batch gave it.
    IF v_cur IS DISTINCT FROM r.new_value THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    IF r.field = 'title' THEN UPDATE public.movies SET title = coalesce(r.old_value, title) WHERE id = r.movie_id;
    ELSIF r.field = 'country' THEN UPDATE public.movies SET country = r.old_value WHERE id = r.movie_id;
    ELSIF r.field = 'release_year' THEN UPDATE public.movies SET release_year = r.old_value::int WHERE id = r.movie_id;
    ELSE UPDATE public.movies SET industry = r.old_value WHERE id = r.movie_id;
    END IF;
    UPDATE public.movie_data_changes SET reverted_at = now() WHERE id = r.id;
    v_restored := v_restored + 1;
  END LOOP;

  RETURN jsonb_build_object('restored', v_restored, 'skipped', v_skipped);
END;
$$;

-- 6. Grants -----------------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.data_quality_apply(jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.data_quality_undo(uuid) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.data_quality_apply(jsonb, text) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.data_quality_undo(uuid) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.data_quality_apply(jsonb, text) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.data_quality_undo(uuid) TO authenticated';
  END IF;
END $$;
