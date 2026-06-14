-- CRITICAL SECURITY FIX: Remove public access to sensitive profile data
-- The current "Public profile info viewable by everyone" policy exposes ALL profile columns
-- including admin roles, notification preferences, and other sensitive data

-- Remove the overly permissive policy that exposes sensitive data
DROP POLICY IF EXISTS "Public profile info viewable by everyone" ON public.profiles;

-- The public_profiles view already exists and only exposes safe fields:
-- (id, user_id, display_name, avatar_url, bio, created_at)
-- Applications should query this view for public profile information instead of the main table

-- Ensure RLS is properly configured with only secure policies:
-- 1. Users can view their own complete profile (including sensitive data)
-- 2. Admins can view all profiles (using is_admin() security definer function)  
-- 3. NO public access to the main profiles table

-- Verify the remaining policies are secure:
-- These policies should already exist from previous migrations:
-- "Users can view their own full profile" - USING (auth.uid() = user_id)
-- "Admins can view all profiles" - USING (is_admin())
-- "Users can insert their own profile" - WITH CHECK (auth.uid() = user_id)
-- "Users can update their own profile" - USING (auth.uid() = user_id)

-- Add a comment to the table to remind developers about the security requirement
COMMENT ON TABLE public.profiles IS 'SECURITY: This table contains sensitive user data. Public access should use public_profiles view only. Direct table access restricted to profile owners and admins.';