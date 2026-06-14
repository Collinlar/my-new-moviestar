-- Add duration column to movies table
ALTER TABLE public.movies 
ADD COLUMN duration INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN public.movies.duration IS 'Movie duration in minutes';

-- Create index for better query performance if needed
CREATE INDEX IF NOT EXISTS idx_movies_duration ON public.movies(duration);
