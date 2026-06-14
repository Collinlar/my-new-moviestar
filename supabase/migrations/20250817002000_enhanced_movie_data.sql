-- Enhanced Movie Data Migration
-- This migration adds comprehensive movie information including cast, crew, trailers, and awards

-- Add new columns to movies table
ALTER TABLE public.movies
ADD COLUMN IF NOT EXISTS director TEXT,
ADD COLUMN IF NOT EXISTS producer TEXT,
ADD COLUMN IF NOT EXISTS writer TEXT,
ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS box_office DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS rating TEXT,
ADD COLUMN IF NOT EXISTS synopsis TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT,
ADD COLUMN IF NOT EXISTS content_warning TEXT,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create movie_cast table for cast information
CREATE TABLE IF NOT EXISTS public.movie_cast (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  character TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movie_crew table for crew information
CREATE TABLE IF NOT EXISTS public.movie_crew (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movie_trailers table for trailer information
CREATE TABLE IF NOT EXISTS public.movie_trailers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('teaser', 'trailer', 'behind-the-scenes')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movie_awards table for award information
CREATE TABLE IF NOT EXISTS public.movie_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  year INTEGER NOT NULL,
  won BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movie_related table for related movies suggestions
CREATE TABLE IF NOT EXISTS public.movie_related (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  related_movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('sequel', 'prequel', 'remake', 'similar', 'franchise')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(movie_id, related_movie_id)
);

-- Enable Row Level Security on new tables
ALTER TABLE public.movie_cast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_related ENABLE ROW LEVEL SECURITY;

-- Create policies for movie_cast
CREATE POLICY "Anyone can view movie cast" ON public.movie_cast FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie cast" ON public.movie_cast FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can update movie cast" ON public.movie_cast FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can delete movie cast" ON public.movie_cast FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@example.com');

-- Create policies for movie_crew
CREATE POLICY "Anyone can view movie crew" ON public.movie_crew FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie crew" ON public.movie_crew FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can update movie crew" ON public.movie_crew FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can delete movie crew" ON public.movie_crew FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@example.com');

-- Create policies for movie_trailers
CREATE POLICY "Anyone can view movie trailers" ON public.movie_trailers FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie trailers" ON public.movie_trailers FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can update movie trailers" ON public.movie_trailers FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can delete movie trailers" ON public.movie_trailers FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@example.com');

-- Create policies for movie_awards
CREATE POLICY "Anyone can view movie awards" ON public.movie_awards FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie awards" ON public.movie_awards FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can update movie awards" ON public.movie_awards FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can delete movie awards" ON public.movie_awards FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@example.com');

-- Create policies for movie_related
CREATE POLICY "Anyone can view movie related" ON public.movie_related FOR SELECT USING (true);
CREATE POLICY "Admins can insert movie related" ON public.movie_related FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can update movie related" ON public.movie_related FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@example.com');
CREATE POLICY "Admins can delete movie related" ON public.movie_related FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@example.com');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movie_cast_movie_id ON public.movie_cast(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_cast_name ON public.movie_cast(name);
CREATE INDEX IF NOT EXISTS idx_movie_crew_movie_id ON public.movie_crew(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_crew_department ON public.movie_crew(department);
CREATE INDEX IF NOT EXISTS idx_movie_trailers_movie_id ON public.movie_trailers(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_trailers_type ON public.movie_trailers(type);
CREATE INDEX IF NOT EXISTS idx_movie_awards_movie_id ON public.movie_awards(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_awards_year ON public.movie_awards(year);
CREATE INDEX IF NOT EXISTS idx_movie_related_movie_id ON public.movie_related(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_related_relationship ON public.movie_related(relationship_type);

-- Add indexes for new movie columns
CREATE INDEX IF NOT EXISTS idx_movies_director ON public.movies(director);
CREATE INDEX IF NOT EXISTS idx_movies_producer ON public.movies(producer);
CREATE INDEX IF NOT EXISTS idx_movies_country ON public.movies(country);
CREATE INDEX IF NOT EXISTS idx_movies_featured ON public.movies(featured);
CREATE INDEX IF NOT EXISTS idx_movies_is_featured ON public.movies(is_featured);
