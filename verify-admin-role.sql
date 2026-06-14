-- Verify Admin Role for User
-- Run this in Supabase SQL Editor to check if the user has admin role

-- Replace 'callmejd.01@gmail.com' with the user's email
SELECT 
    au.email,
    p.user_id,
    p.display_name,
    p.role,
    p.created_at,
    p.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE au.email = 'callmejd.01@gmail.com';

