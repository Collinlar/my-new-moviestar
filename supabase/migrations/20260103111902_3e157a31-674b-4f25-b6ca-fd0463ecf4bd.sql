-- Add editor_note column to movies table for curated editorial commentary
ALTER TABLE public.movies 
ADD COLUMN editor_note TEXT;