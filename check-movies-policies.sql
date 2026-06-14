-- Check Current Movies Table Policies
-- Run this to see what RLS policies are currently active

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'movies'
ORDER BY policyname;

-- Also check if user can insert
SELECT 
    'Testing if user can insert...' as test;

