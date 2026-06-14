-- ============================================================
-- MuvieStars: Movie deduplication script
-- Run each step separately in the Supabase SQL editor.
-- Always run Step 1 first to review what will be deleted.
-- ============================================================


-- ============================================================
-- STEP 1: Preview duplicates — no data is changed here
-- ============================================================
SELECT
  title,
  release_year,
  country,
  youtube_url,
  COUNT(*)                              AS copies,
  array_agg(id ORDER BY created_at)    AS all_ids,
  MIN(created_at)::date                AS first_inserted,
  MAX(created_at)::date                AS last_inserted
FROM movies
GROUP BY title, release_year, country, youtube_url
HAVING COUNT(*) > 1
ORDER BY copies DESC, title;


-- ============================================================
-- STEP 2: Remove exact youtube_url duplicates
-- Keeps the most recently inserted record (the corrected import).
-- ============================================================
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY youtube_url
      ORDER BY created_at DESC
    ) AS rn
  FROM movies
  WHERE youtube_url IS NOT NULL
)
DELETE FROM movies
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- How many rows were removed? Run this after Step 2:
-- SELECT COUNT(*) AS remaining FROM movies;


-- ============================================================
-- STEP 3: Remove remaining title + release_year duplicates
-- Catches the same film inserted with a different youtube URL.
-- Keeps the record with the most complete data.
-- ============================================================
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(title)), release_year
      ORDER BY
        (
          CASE WHEN synopsis         IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN cultural_context IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN keywords         IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN director         IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN description      IS NOT NULL THEN 1 ELSE 0 END
        ) DESC,
        created_at DESC
    ) AS rn
  FROM movies
)
DELETE FROM movies
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);


-- ============================================================
-- STEP 4: Verify — confirm no duplicates remain
-- ============================================================
SELECT COUNT(*) AS total_movies FROM movies;

SELECT title, release_year, COUNT(*) AS copies
FROM movies
GROUP BY title, release_year
HAVING COUNT(*) > 1
ORDER BY copies DESC;
