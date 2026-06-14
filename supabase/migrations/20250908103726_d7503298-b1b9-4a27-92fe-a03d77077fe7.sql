-- Add missing tables that are referenced in the code but missing from the schema

-- Create helpful_votes table for tracking helpful review votes
CREATE TABLE IF NOT EXISTS public.helpful_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  review_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, review_id)
);

-- Create review_flags table for flagging inappropriate reviews
CREATE TABLE IF NOT EXISTS public.review_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  review_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Enable RLS on new tables
ALTER TABLE public.helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view all helpful votes" ON public.helpful_votes;
DROP POLICY IF EXISTS "Users can vote for reviews" ON public.helpful_votes;
DROP POLICY IF EXISTS "Users can remove their own votes" ON public.helpful_votes;
DROP POLICY IF EXISTS "Users can view their own flags" ON public.review_flags;
DROP POLICY IF EXISTS "Admins can view all flags" ON public.review_flags;
DROP POLICY IF EXISTS "Users can create flags" ON public.review_flags;
DROP POLICY IF EXISTS "Users can update their own flags" ON public.review_flags;

-- Create RLS policies for helpful_votes
CREATE POLICY "Users can view all helpful votes" 
ON public.helpful_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can vote for reviews" 
ON public.helpful_votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes" 
ON public.helpful_votes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for review_flags
CREATE POLICY "Users can view their own flags" 
ON public.review_flags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all flags" 
ON public.review_flags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Users can create flags" 
ON public.review_flags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flags" 
ON public.review_flags 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create or replace functions
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews 
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews 
    SET helpful_count = helpful_count - 1
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_review_flag_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews 
    SET flag_count = flag_count + 1
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reviews 
    SET flag_count = flag_count - 1
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS update_helpful_count_trigger ON public.helpful_votes;
CREATE TRIGGER update_helpful_count_trigger
  AFTER INSERT OR DELETE ON public.helpful_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_review_helpful_count();

DROP TRIGGER IF EXISTS update_flag_count_trigger ON public.review_flags;
CREATE TRIGGER update_flag_count_trigger
  AFTER INSERT OR DELETE ON public.review_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_review_flag_count();

-- Add function to get trending movies
CREATE OR REPLACE FUNCTION public.get_trending_movies()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  release_year INTEGER,
  genre movie_genre,
  language movie_language,
  duration INTEGER,
  poster_url TEXT,
  youtube_url TEXT,
  creator_id UUID,
  average_rating NUMERIC,
  review_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id, m.title, m.description, m.release_year, m.genre, m.language,
    m.duration, m.poster_url, m.youtube_url, m.creator_id, 
    m.average_rating, m.review_count, m.created_at, m.updated_at
  FROM public.movies m
  WHERE m.review_count > 0
  ORDER BY (m.average_rating * m.review_count) DESC, m.created_at DESC
  LIMIT 20;
$$;