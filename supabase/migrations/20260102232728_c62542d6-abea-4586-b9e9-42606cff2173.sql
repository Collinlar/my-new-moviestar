-- Phase 2: Unified People & Filmography System

-- Create role enum for movie_people
DO $$ BEGIN
  CREATE TYPE person_role AS ENUM ('actor', 'director', 'writer', 'producer', 'cinematographer', 'editor', 'composer', 'costume_designer', 'production_designer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create people table (unified talent database)
CREATE TABLE IF NOT EXISTS public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  country TEXT,
  bio TEXT,
  date_of_birth DATE,
  date_of_death DATE,
  verified BOOLEAN DEFAULT false,
  profile_image TEXT,
  imdb_id TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for people table
CREATE INDEX IF NOT EXISTS idx_people_full_name ON public.people(full_name);
CREATE INDEX IF NOT EXISTS idx_people_country ON public.people(country);
CREATE INDEX IF NOT EXISTS idx_people_verified ON public.people(verified);

-- Enable RLS on people table
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- RLS policies for people
CREATE POLICY "Anyone can view people" ON public.people
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert people" ON public.people
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'email'::text) = 'kofcollkcl100@gmail.com'::text
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can update people" ON public.people
  FOR UPDATE USING (
    (auth.jwt() ->> 'email'::text) = 'kofcollkcl100@gmail.com'::text
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can delete people" ON public.people
  FOR DELETE USING (
    (auth.jwt() ->> 'email'::text) = 'kofcollkcl100@gmail.com'::text
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- Create movie_people join table (replaces movie_cast and movie_crew)
CREATE TABLE IF NOT EXISTS public.movie_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role person_role NOT NULL,
  character_name TEXT,
  billing_order INTEGER DEFAULT 0,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(movie_id, person_id, role, character_name)
);

-- Create indexes for movie_people
CREATE INDEX IF NOT EXISTS idx_movie_people_movie_id ON public.movie_people(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_people_person_id ON public.movie_people(person_id);
CREATE INDEX IF NOT EXISTS idx_movie_people_role ON public.movie_people(role);
CREATE INDEX IF NOT EXISTS idx_movie_people_billing_order ON public.movie_people(billing_order);

-- Enable RLS on movie_people
ALTER TABLE public.movie_people ENABLE ROW LEVEL SECURITY;

-- RLS policies for movie_people
CREATE POLICY "Anyone can view movie_people" ON public.movie_people
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert movie_people" ON public.movie_people
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'email'::text) = 'kofcollkcl100@gmail.com'::text
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can update movie_people" ON public.movie_people
  FOR UPDATE USING (
    (auth.jwt() ->> 'email'::text) = 'kofcollkcl100@gmail.com'::text
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can delete movie_people" ON public.movie_people
  FOR DELETE USING (
    (auth.jwt() ->> 'email'::text) = 'kofcollkcl100@gmail.com'::text
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- Create trigger for updated_at on people
CREATE TRIGGER update_people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.people IS 'Unified table for all talent (actors, directors, crew) in the African movie database';
COMMENT ON TABLE public.movie_people IS 'Join table linking movies to people with role and billing information';
COMMENT ON COLUMN public.people.verified IS 'Whether this person profile has been verified by admins';
COMMENT ON COLUMN public.movie_people.billing_order IS 'Order in credits (1 = top billing)';