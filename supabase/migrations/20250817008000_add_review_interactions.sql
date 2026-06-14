-- Add Review Interactions Migration
-- This migration adds helpful votes and comments functionality

-- Add helpful_votes table to track who voted for what
CREATE TABLE IF NOT EXISTS public.helpful_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Add flags table for review moderation
CREATE TABLE IF NOT EXISTS public.review_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_helpful_votes_review_id ON public.helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_helpful_votes_user_id ON public.helpful_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_flags_review_id ON public.review_flags(review_id);
CREATE INDEX IF NOT EXISTS idx_review_flags_user_id ON public.review_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_review_flags_status ON public.review_flags(status);
CREATE INDEX IF NOT EXISTS idx_review_flags_created_at ON public.review_flags(created_at);

-- Enable RLS on new tables
ALTER TABLE public.helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for helpful_votes
CREATE POLICY "Users can view all helpful votes" ON public.helpful_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote for reviews" ON public.helpful_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes" ON public.helpful_votes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for review_flags
CREATE POLICY "Users can view their own flags" ON public.review_flags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create flags" ON public.review_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flags" ON public.review_flags
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all flags
CREATE POLICY "Admins can view all flags" ON public.review_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update helpful count on reviews
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update flag count on reviews
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update counts
CREATE TRIGGER update_helpful_count_on_vote
  AFTER INSERT OR DELETE ON public.helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_helpful_count();

CREATE TRIGGER update_flag_count_on_flag
  AFTER INSERT OR DELETE ON public.review_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_flag_count();

-- Note: update_updated_at_column function should be created separately if needed
