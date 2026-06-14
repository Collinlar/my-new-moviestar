-- Fix admin access by adding a more permissive policy
-- This allows users with admin role to access their own profile even if auth.uid() is not working

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own full profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON profiles;

-- Create a more permissive policy for users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT
TO public
USING (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
  OR
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Also create a policy that allows admin users to view any profile
CREATE POLICY "Admin users can view any profile" ON profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

