-- Fix security issues introduced by previous migration
-- Remove overly permissive policy and implement secure public access

-- Step 1: Remove the overly permissive policy
DROP POLICY IF EXISTS "Public profile info viewable by everyone" ON public.profiles;

-- Step 2: Update the public_profiles view to use SECURITY DEFINER carefully
-- This is controlled and limited to only basic, non-sensitive profile information
DROP VIEW IF EXISTS public.public_profiles;

-- Step 3: Create a secure function to get public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile_data()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.created_at
  FROM profiles p
  -- Only return basic, non-sensitive information
  -- Exclude bio, user_id, and other sensitive fields
$$;

-- Step 4: Create the public_profiles view using the secure function
CREATE VIEW public.public_profiles AS 
SELECT * FROM public.get_public_profile_data();

-- Step 5: Grant access to the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Step 6: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_public_profile_data() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data() TO authenticated;

-- Success message
SELECT 'Security issues fixed - public profiles now use controlled access!' as status;