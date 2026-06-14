-- Add Review Engagement Fields Migration
-- This migration adds helpful_count and flag_count to reviews table

-- Add helpful_count and flag_count to reviews table
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_helpful_count ON public.reviews(helpful_count);
CREATE INDEX IF NOT EXISTS idx_reviews_flag_count ON public.reviews(flag_count);

-- Update existing reviews to have default values
UPDATE public.reviews 
SET helpful_count = 0, flag_count = 0 
WHERE helpful_count IS NULL OR flag_count IS NULL;

-- Add RLS policies for the new fields
-- Users can update helpful_count on their own reviews
CREATE POLICY "Users can update helpful count on own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can view helpful_count and comment_count
-- (This is already covered by existing SELECT policies)
