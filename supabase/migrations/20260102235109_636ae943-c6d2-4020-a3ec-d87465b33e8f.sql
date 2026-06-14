-- Create review_type enum
CREATE TYPE public.review_type AS ENUM ('audience', 'critic');

-- Add multi-dimensional rating columns and review_type to reviews table
ALTER TABLE public.reviews
ADD COLUMN review_type public.review_type DEFAULT 'audience',
ADD COLUMN story_rating integer CHECK (story_rating >= 1 AND story_rating <= 5),
ADD COLUMN cultural_rating integer CHECK (cultural_rating >= 1 AND cultural_rating <= 5),
ADD COLUMN production_rating integer CHECK (production_rating >= 1 AND production_rating <= 5),
ADD COLUMN rewatch_rating integer CHECK (rewatch_rating >= 1 AND rewatch_rating <= 5);

-- Add comment for documentation
COMMENT ON COLUMN public.reviews.story_rating IS 'Rating for story/narrative quality (1-5)';
COMMENT ON COLUMN public.reviews.cultural_rating IS 'Rating for cultural authenticity and representation (1-5)';
COMMENT ON COLUMN public.reviews.production_rating IS 'Rating for production quality (cinematography, sound, etc) (1-5)';
COMMENT ON COLUMN public.reviews.rewatch_rating IS 'Rating for rewatchability (1-5)';
COMMENT ON COLUMN public.reviews.review_type IS 'Whether this is an audience or critic review';