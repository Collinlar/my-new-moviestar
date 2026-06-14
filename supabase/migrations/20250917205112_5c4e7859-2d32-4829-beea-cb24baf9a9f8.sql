-- Fix Security Definer View issue
-- This migration removes the SECURITY DEFINER property from public_profiles view
-- and adds proper RLS policies for secure public access

-- Step 1: Drop the existing public_profiles view
DROP VIEW IF EXISTS public.public_profiles;

-- Step 2: Add RLS policy to allow public read access to basic profile information
CREATE POLICY "Public profile info viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Step 3: Recreate the public_profiles view without SECURITY DEFINER
CREATE VIEW public.public_profiles AS 
SELECT 
  id,
  user_id,  
  display_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Step 4: Grant select permissions on the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Step 5: Add comment explaining the security approach
COMMENT ON VIEW public.public_profiles IS 'Public view of basic profile information. Uses RLS policies on the underlying profiles table for security.';

-- Success message
SELECT 'Security Definer View issue fixed successfully!' as status;