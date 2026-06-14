-- TEMPORARY FIX: Disable RLS to test if the profile data is accessible
-- ONLY USE THIS FOR TESTING - NOT FOR PRODUCTION!
-- After confirming it works, we'll re-enable RLS with proper policies

-- Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Grant full access temporarily
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Show current status
SELECT 'RLS Disabled - Test if profile can be accessed now' as status;

