-- Fix creators table policies to avoid recursion
-- Remove policies that query profiles table to check admin status

-- Drop existing policies on creators table
DROP POLICY IF EXISTS "Admins can insert creators" ON creators;
DROP POLICY IF EXISTS "Admins can update creators" ON creators;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON creators;
DROP POLICY IF EXISTS "Allow public read access" ON creators;
DROP POLICY IF EXISTS "Creators are viewable by everyone" ON creators;

-- Create clean, simple policies for creators table

-- Allow public read access to creators
CREATE POLICY "Public can view creators" ON creators
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert creators (for now, we'll restrict this later if needed)
CREATE POLICY "Authenticated users can insert creators" ON creators
FOR INSERT
TO public
WITH CHECK (auth.role() = 'authenticated');

-- Allow specific admin email to update creators
CREATE POLICY "Admin can update creators" ON creators
FOR UPDATE
TO public
USING ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com');

-- Allow specific admin email to delete creators
CREATE POLICY "Admin can delete creators" ON creators
FOR DELETE
TO public
USING ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com');
