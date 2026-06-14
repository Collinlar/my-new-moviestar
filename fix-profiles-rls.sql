-- Fix Profiles RLS - Allow Users to Read Their Own Profile
-- Run this in Supabase SQL Editor

-- Step 1: Re-enable RLS if needed
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Grant necessary permissions on the table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Step 3: Drop conflicting policies
DROP POLICY IF EXISTS "Public can view basic profile display info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for management" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Limited public profile visibility" ON public.profiles;
DROP POLICY IF EXISTS "Public profile info viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own username" ON public.profiles;

-- Step 4: Create clean, working policies

-- Policy 1: Users can always read their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Allow authenticated users to view basic profile info (for displays)
CREATE POLICY "Authenticated can view basic profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Step 5: Create or recreate the public view
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS 
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  created_at
FROM profiles;

-- Grant permissions on the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Success message
SELECT 'RLS policies fixed! Users can now read their own profiles.' as status;

