-- Admin Features Migration
-- This migration adds user management, content moderation, and admin features

-- Add admin fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspension_until TIMESTAMP WITH TIME ZONE;

-- Add review status and moderation fields to reviews table
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderated_by ON public.reviews(moderated_by);

-- Update RLS policies for new fields
-- Profiles: Users can view their own profile, admins can view all
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com');

-- Reviews: Anyone can view approved reviews, users can view their own pending/rejected
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (
    status = 'approved' OR 
    auth.uid() = user_id OR 
    auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com'
  );

-- Only admins can update review status
CREATE POLICY "Admins can update review status" ON public.reviews
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com');

-- Set the creator as admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'kofcollkcl100@gmail.com'
);
