-- Grant Admin Access - WORKING VERSION
-- 
-- THIS IS THE SCRIPT YOU NEED TO RUN IN SUPABASE SQL EDITOR
--
-- Instructions:
-- 1. Replace 'your-user@example.com' on line 9 with the actual email address
-- 2. Copy this entire script
-- 3. Paste into Supabase SQL Editor
-- 4. Click Run

DO $$
DECLARE
    target_email TEXT := 'your-user@example.com';  -- ⬅️ CHANGE THIS EMAIL!
    user_uuid UUID;
    current_role TEXT;
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Starting admin access grant for: %', target_email;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    -- Step 1: Get the user ID
    RAISE NOTICE 'Step 1: Looking up user in auth.users...';
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = target_email;
    
    -- Check if user exists
    IF user_uuid IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ ERROR: User not found: %', target_email;
        RAISE NOTICE '';
        RAISE NOTICE 'Available users:';
        FOR current_role IN 
            SELECT email FROM auth.users ORDER BY email
        LOOP
            RAISE NOTICE '  - %', current_role;
        END LOOP;
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ User found. ID: %', user_uuid;
    
    -- Step 2: Get current role
    RAISE NOTICE 'Step 2: Checking current role...';
    SELECT role INTO current_role 
    FROM public.profiles 
    WHERE user_id = user_uuid;
    
    IF current_role IS NOT NULL THEN
        RAISE NOTICE 'Current role: %', current_role;
    ELSE
        RAISE NOTICE 'No role set (default: user)';
    END IF;
    
    -- Step 3: Update the role
    RAISE NOTICE 'Step 3: Updating role to admin...';
    UPDATE public.profiles 
    SET 
        role = 'admin',
        updated_at = now()
    WHERE user_id = user_uuid;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Step 4: Verify the update
    IF updated_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '🎉 SUCCESS!';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE 'User: %', target_email;
        RAISE NOTICE 'Role: admin';
        RAISE NOTICE 'Updated: %', now();
        RAISE NOTICE '';
        RAISE NOTICE '✅ The user now has admin privileges!';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ ERROR: Update failed';
        RAISE NOTICE 'User exists but role was not updated.';
    END IF;
    
END $$;

-- Final verification
-- Uncomment and change email to verify the update worked
/*
SELECT 
    au.email,
    p.display_name,
    p.role,
    p.updated_at
FROM auth.users au
JOIN public.profiles p ON au.id = p.user_id
WHERE au.email = 'your-user@example.com';
*/
