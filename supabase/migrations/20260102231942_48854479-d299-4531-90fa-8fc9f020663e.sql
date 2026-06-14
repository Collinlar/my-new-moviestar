-- Phase 1: Repository-First Data Model Extensions

-- Create distribution_status enum
DO $$ BEGIN
  CREATE TYPE distribution_status AS ENUM ('cinema', 'streaming', 'dvd', 'tv', 'unavailable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create created_source enum
DO $$ BEGIN
  CREATE TYPE created_source AS ENUM ('admin', 'user_submission', 'partner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to movies table
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS original_title TEXT,
ADD COLUMN IF NOT EXISTS production_company TEXT,
ADD COLUMN IF NOT EXISTS distribution_status distribution_status DEFAULT 'unavailable',
ADD COLUMN IF NOT EXISTS is_streaming_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_source created_source DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS festivals TEXT,
ADD COLUMN IF NOT EXISTS cultural_context TEXT;

-- Create index for distribution status filtering
CREATE INDEX IF NOT EXISTS idx_movies_distribution_status ON public.movies(distribution_status);
CREATE INDEX IF NOT EXISTS idx_movies_is_streaming_available ON public.movies(is_streaming_available);

-- Add comment for documentation
COMMENT ON COLUMN public.movies.distribution_status IS 'Current distribution method: cinema, streaming, dvd, tv, or unavailable';
COMMENT ON COLUMN public.movies.is_streaming_available IS 'Derived: true only if distribution_status=streaming AND streaming URL exists';
COMMENT ON COLUMN public.movies.created_source IS 'How this movie was added: admin, user_submission, or partner';