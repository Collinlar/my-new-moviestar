-- Fix conflicting RLS policies on reviews table
-- The issue is that there are two conflicting SELECT policies

-- Drop all existing SELECT policies on reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;

-- Create a single, clear policy for viewing reviews
CREATE POLICY "Public can view approved reviews" ON reviews
FOR SELECT
TO public
USING (
  status = 'approved' 
  OR 
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
);

-- Also allow admin users to view all reviews for moderation
CREATE POLICY "Admins can view all reviews" ON reviews
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);
