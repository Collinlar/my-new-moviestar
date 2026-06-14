-- Add Profile Username Migration
-- This migration adds username field to profiles table

-- Add username field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username_lookup ON public.profiles(username);

-- Update existing profiles to have a default username based on user_id
UPDATE public.profiles 
SET username = COALESCE(
  username, 
  'user_' || substr(user_id::text, 1, 8)
)
WHERE username IS NULL;

-- Add RLS policies for username
-- Users can update their own username
CREATE POLICY "Users can update own username" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Anyone can view usernames (covered by existing SELECT policies)
