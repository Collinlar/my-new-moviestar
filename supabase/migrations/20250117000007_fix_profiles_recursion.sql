-- Fix infinite recursion in profiles RLS policies
-- The issue is that some policies are querying the profiles table to check admin status,
-- which creates infinite recursion

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin users can view any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for management" ON profiles;
DROP POLICY IF EXISTS "Public can view basic profile display info" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own username" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create clean, non-recursive policies

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
);

-- Allow public to view basic profile info (for display purposes)
CREATE POLICY "Public can view basic profile info" ON profiles
FOR SELECT
TO public
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
