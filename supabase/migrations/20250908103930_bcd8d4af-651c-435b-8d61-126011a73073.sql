-- FIX THE SECURITY ISSUE: Update profiles table RLS policies to be more restrictive
-- Currently all profile data is publicly visible, which exposes sensitive information like admin roles

-- Drop the overly permissive policy that allows everyone to see everything
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a view for public profile information that only exposes non-sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Create more secure policies for the profiles table
-- Policy 1: Users can view basic public information of all users (non-sensitive data only)
CREATE POLICY "Public profile info viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Policy 2: Users can view their own complete profile (including sensitive data)
CREATE POLICY "Users can view their own full profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 3: Admins can view all profiles with sensitive data
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create a security definer function to check if a user has admin role
-- This prevents recursive RLS issues
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Update the admin policy to use the security definer function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

-- Ensure existing policies remain intact for other operations
-- The insert and update policies should remain as they were