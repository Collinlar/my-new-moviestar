-- Backfill movie_people from director/producer/writer text columns.
-- Text columns are NOT dropped — they remain as-is for backwards compatibility.
-- Uses NOT EXISTS guards because character_name is nullable and PostgreSQL does not
-- enforce UNIQUE constraints across rows where nullable columns are NULL.

-- ─── DIRECTORS ──────────────────────────────────────────────────────────────

-- Step 1: Insert people from director text (comma-separated names)
INSERT INTO public.people (full_name)
SELECT DISTINCT TRIM(t.name_part)
FROM public.movies
CROSS JOIN LATERAL unnest(string_to_array(COALESCE(director, ''), ',')) AS t(name_part)
WHERE director IS NOT NULL
  AND LENGTH(TRIM(t.name_part)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.people WHERE full_name = TRIM(t.name_part)
  );

-- Step 2: Link directors to movies
INSERT INTO public.movie_people (movie_id, person_id, role, billing_order)
SELECT DISTINCT m.id, p.id, 'director'::person_role, 1
FROM public.movies m
CROSS JOIN LATERAL unnest(string_to_array(COALESCE(m.director, ''), ',')) AS t(name_part)
JOIN (
  SELECT DISTINCT ON (full_name) id, full_name
  FROM public.people
  ORDER BY full_name, created_at
) p ON p.full_name = TRIM(t.name_part)
WHERE m.director IS NOT NULL
  AND LENGTH(TRIM(t.name_part)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.movie_people mp
    WHERE mp.movie_id = m.id AND mp.person_id = p.id AND mp.role = 'director'
  );

-- ─── PRODUCERS ──────────────────────────────────────────────────────────────

-- Step 3: Insert people from producer text
INSERT INTO public.people (full_name)
SELECT DISTINCT TRIM(t.name_part)
FROM public.movies
CROSS JOIN LATERAL unnest(string_to_array(COALESCE(producer, ''), ',')) AS t(name_part)
WHERE producer IS NOT NULL
  AND LENGTH(TRIM(t.name_part)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.people WHERE full_name = TRIM(t.name_part)
  );

-- Step 4: Link producers to movies
INSERT INTO public.movie_people (movie_id, person_id, role, billing_order)
SELECT DISTINCT m.id, p.id, 'producer'::person_role, 1
FROM public.movies m
CROSS JOIN LATERAL unnest(string_to_array(COALESCE(m.producer, ''), ',')) AS t(name_part)
JOIN (
  SELECT DISTINCT ON (full_name) id, full_name
  FROM public.people
  ORDER BY full_name, created_at
) p ON p.full_name = TRIM(t.name_part)
WHERE m.producer IS NOT NULL
  AND LENGTH(TRIM(t.name_part)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.movie_people mp
    WHERE mp.movie_id = m.id AND mp.person_id = p.id AND mp.role = 'producer'
  );

-- ─── WRITERS ────────────────────────────────────────────────────────────────

-- Step 5: Insert people from writer text
INSERT INTO public.people (full_name)
SELECT DISTINCT TRIM(t.name_part)
FROM public.movies
CROSS JOIN LATERAL unnest(string_to_array(COALESCE(writer, ''), ',')) AS t(name_part)
WHERE writer IS NOT NULL
  AND LENGTH(TRIM(t.name_part)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.people WHERE full_name = TRIM(t.name_part)
  );

-- Step 6: Link writers to movies
INSERT INTO public.movie_people (movie_id, person_id, role, billing_order)
SELECT DISTINCT m.id, p.id, 'writer'::person_role, 1
FROM public.movies m
CROSS JOIN LATERAL unnest(string_to_array(COALESCE(m.writer, ''), ',')) AS t(name_part)
JOIN (
  SELECT DISTINCT ON (full_name) id, full_name
  FROM public.people
  ORDER BY full_name, created_at
) p ON p.full_name = TRIM(t.name_part)
WHERE m.writer IS NOT NULL
  AND LENGTH(TRIM(t.name_part)) > 1
  AND NOT EXISTS (
    SELECT 1 FROM public.movie_people mp
    WHERE mp.movie_id = m.id AND mp.person_id = p.id AND mp.role = 'writer'
  );
