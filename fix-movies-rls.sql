-- Fix Movies Table RLS - Allow Admins to Add/Edit Movies
-- Run this in Supabase SQL Editor

-- Step 1: Grant permissions on movies table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movies TO authenticated;

-- Step 2: Drop ALL existing policies on movies table
DROP POLICY IF EXISTS "Admins can insert movies" ON public.movies;
DROP POLICY IF EXISTS "Admin can insert movies" ON public.movies;
DROP POLICY IF EXISTS "Admins can update movies" ON public.movies;
DROP POLICY IF EXISTS "Admin can update movies" ON public.movies;
DROP POLICY IF EXISTS "Admin can delete movies" ON public.movies;
DROP POLICY IF EXISTS "Public can view movies" ON public.movies;
DROP POLICY IF EXISTS "Movies are viewable by everyone" ON public.movies;
DROP POLICY IF EXISTS "Anyone can view movies" ON public.movies;
DROP POLICY IF EXISTS "Movies are viewable by everyone" ON public.movies;

-- Step 3: Create working policies

-- Anyone can view movies
CREATE POLICY "Anyone can view movies" 
ON public.movies 
FOR SELECT 
USING (true);

-- Admins can insert movies (check role from profiles table)
CREATE POLICY "Admins can insert movies" 
ON public.movies 
FOR INSERT 
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Admins can update movies
CREATE POLICY "Admins can update movies" 
ON public.movies 
FOR UPDATE 
TO authenticated
USING (
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Admins can delete movies
CREATE POLICY "Admins can delete movies" 
ON public.movies 
FOR DELETE 
TO authenticated
USING (
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Enable RLS
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT '✅ Movies RLS fixed - Admins can now add/edit movies!' as status;

