-- Grant Admin Access - WORKING VERSION
-- 
-- This script will:
-- 1. Find the user by email
-- 2. Update their role to 'admin' in the profiles table
-- 3. Show the updated profile
--
-- Instructions:
-- 1. Replace 'your-user@example.com' with the actual email
-- 2. Run in Supabase SQL Editor

-- First, let's check current users and their roles
SELECT 
    au.email,
    p.display_name,
    COALESCE(p.role, 'user') as current_role,
    p.user_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
ORDER BY au.email;

-- ============================================================
-- UPDATE SECTION - Change the email below
-- ============================================================
DO $$
DECLARE
    target_email TEXT := 'your-user@example.com';  -- ⬅️ CHANGE THIS EMAIL!
    user_uuid UUID;
    profile_result RECORD;
BEGIN
    -- Step 1: Get the user ID from auth.users
    RAISE NOTICE 'Looking up user: %', target_email;
    
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = target_email;
    
    -- Step 2: Check if user exists
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION '❌ User not found: %. Please check the email address.', target_email;
    END IF;
    
    RAISE NOTICE '✅ User found. ID: %', user_uuid;
    
    -- Step 3: Check if profile exists
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_uuid) THEN
        RAISE EXCEPTION '❌ Profile not found for user: %. The user may not have completed their profile setup.', target_email;
    END IF;
    
    -- Step 4: Get current role
    SELECT role INTO profile_result 
    FROM public.profiles 
    WHERE user_id = user_uuid;
    
    IF profile_result IS NOT NULL THEN
        RAISE NOTICE 'Current role: %', COALESCE(profile_result, 'user');
    END IF;
    
    -- Step 5: Update the role
    UPDATE public.profiles 
    SET 
        role = 'admin',
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Step 6: Verify the update
    IF FOUND THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Successfully granted admin access!';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE 'User: %', target_email;
        RAISE NOTICE 'Role: admin';
        RAISE NOTICE 'Updated: %', now();
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        
        -- Show updated profile
        FOR profile_result IN 
            SELECT * FROM public.profiles WHERE user_id = user_uuid
        LOOP
            RAISE NOTICE 'Profile Details:';
            RAISE NOTICE '  - Display Name: %', profile_result.display_name;
            RAISE NOTICE '  - Role: %', profile_result.role;
            RAISE NOTICE '  - Updated: %', profile_result.updated_at;
        END LOOP;
        
    ELSE
        RAISE EXCEPTION '❌ Update failed. User exists but role was not updated.';
    END IF;
    
END $$;

-- Final verification
-- (Change the email to match the one you updated)
/*
SELECT 
    au.email,
    p.display_name,
    COALESCE(p.role, 'user') as new_role,
    p.updated_at
FROM auth.users au
JOIN public.profiles p ON au.id = p.user_id
WHERE au.email = 'your-user@example.com';
*/

