-- Fix movies table policies to avoid recursion with profiles table
-- Remove policies that query profiles table to check admin status

-- Drop existing policies on movies table
DROP POLICY IF EXISTS "Admins can insert movies" ON movies;
DROP POLICY IF EXISTS "Admins can update movies" ON movies;
DROP POLICY IF EXISTS "Movies are viewable by everyone" ON movies;

-- Create clean, simple policies for movies table

-- Allow public read access to movies
CREATE POLICY "Public can view movies" ON movies
FOR SELECT
TO public
USING (true);

-- Allow specific admin email to insert movies
CREATE POLICY "Admin can insert movies" ON movies
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com');

-- Allow specific admin email to update movies
CREATE POLICY "Admin can update movies" ON movies
FOR UPDATE
TO public
USING ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com')
WITH CHECK ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com');

-- Allow specific admin email to delete movies
CREATE POLICY "Admin can delete movies" ON movies
FOR DELETE
TO public
USING ((auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com');
