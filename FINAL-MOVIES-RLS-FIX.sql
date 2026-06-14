-- FINAL FIX: Movies RLS Policies
-- This will DROP ALL existing policies and create clean ones
-- Run this in Supabase SQL Editor

-- Step 1: Grant permissions
GRANT ALL ON public.movies TO authenticated;
GRANT SELECT ON public.movies TO anon;

-- Step 2: Get list of all policies and drop them dynamically
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop ALL existing policies on movies table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'movies' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.movies', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 3: Create clean policies

-- Policy 1: Anyone can view movies
CREATE POLICY "Anyone can view movies" 
ON public.movies 
FOR SELECT 
TO authenticated, anon
USING (true);

-- Policy 2: Admins can insert movies
-- This checks the role from the profiles table
CREATE POLICY "Admins can insert movies" 
ON public.movies 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow hardcoded admin email
  (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com'
  OR
  -- Allow users with admin role from profiles table
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy 3: Admins can update movies
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

-- Policy 4: Admins can delete movies
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

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Step 5: Show summary of created policies
SELECT 
    policyname,
    cmd as operation,
    'Policy created successfully' as status
FROM pg_policies 
WHERE tablename = 'movies' AND schemaname = 'public'
ORDER BY policyname;

-- Success message
SELECT '✅ Movies RLS fixed - All policies recreated successfully!' as status;

