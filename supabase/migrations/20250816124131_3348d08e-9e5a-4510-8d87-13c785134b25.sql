-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_movie_rating()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update average rating and review count for the movie
  UPDATE public.movies 
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.reviews 
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews 
      WHERE movie_id = COALESCE(NEW.movie_id, OLD.movie_id)
    )
  WHERE id = COALESCE(NEW.movie_id, OLD.movie_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;