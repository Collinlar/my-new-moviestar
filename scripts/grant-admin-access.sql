-- Admin Access Grant SQL Script
-- 
-- This SQL script grants admin access to a registered user in the African Reel Reviews application.
-- 
-- Usage:
--   1. Replace 'user@example.com' with the actual email address
--   2. Optionally change 'admin' to 'moderator' for moderator access
--   3. Execute the script in your Supabase SQL editor or psql
--
-- Examples:
--   - Grant admin access: Change email and run
--   - Grant moderator access: Change email and role to 'moderator'
--   - List all users: Run the SELECT query at the bottom

-- =============================================================================
-- GRANT ADMIN ACCESS TO A SPECIFIC USER
-- =============================================================================

-- Replace 'user@example.com' with the actual email address
-- Replace 'admin' with 'moderator' if you want to grant moderator access instead
DO $$
DECLARE
    target_email TEXT := 'user@example.com';  -- CHANGE THIS EMAIL
    target_role TEXT := 'admin';              -- CHANGE THIS ROLE (user, moderator, admin)
    user_uuid UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = target_email;
    
    -- Check if user exists
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in authentication system', target_email;
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_uuid
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
        RAISE EXCEPTION 'User profile not found for email %', target_email;
    END IF;
    
    -- Update the user's role
    UPDATE public.profiles 
    SET 
        role = target_role,
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Check if update was successful
    IF FOUND THEN
        RAISE NOTICE 'Successfully updated user % to % role', target_email, target_role;
        
        -- Display the updated profile
        PERFORM 
            p.display_name,
            p.role,
            p.updated_at
        FROM public.profiles p
        WHERE p.user_id = user_uuid;
        
    ELSE
        RAISE EXCEPTION 'Failed to update user role for %', target_email;
    END IF;
    
END $$;

-- =============================================================================
-- LIST ALL USERS AND THEIR ROLES
-- =============================================================================

-- Uncomment the following query to list all users and their roles
/*
SELECT 
    au.email,
    p.display_name,
    COALESCE(p.role, 'user') as role,
    p.created_at,
    p.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
ORDER BY p.created_at DESC;
*/

-- =============================================================================
-- GRANT ADMIN ACCESS TO MULTIPLE USERS
-- =============================================================================

-- Uncomment and modify the following block to grant admin access to multiple users
/*
DO $$
DECLARE
    user_emails TEXT[] := ARRAY['user1@example.com', 'user2@example.com', 'user3@example.com'];
    target_role TEXT := 'admin';
    user_email TEXT;
    user_uuid UUID;
BEGIN
    FOREACH user_email IN ARRAY user_emails
    LOOP
        -- Get the user ID from auth.users
        SELECT id INTO user_uuid 
        FROM auth.users 
        WHERE email = user_email;
        
        -- Check if user exists
        IF user_uuid IS NOT NULL THEN
            -- Update the user's role
            UPDATE public.profiles 
            SET 
                role = target_role,
                updated_at = now()
            WHERE user_id = user_uuid;
            
            IF FOUND THEN
                RAISE NOTICE 'Successfully updated user % to % role', user_email, target_role;
            ELSE
                RAISE WARNING 'Failed to update user % - profile not found', user_email;
            END IF;
        ELSE
            RAISE WARNING 'User % not found in authentication system', user_email;
        END IF;
    END LOOP;
END $$;
*/

-- =============================================================================
-- REVOKE ADMIN ACCESS (SET BACK TO USER)
-- =============================================================================

-- Uncomment the following block to revoke admin access and set user back to regular user
/*
DO $$
DECLARE
    target_email TEXT := 'user@example.com';  -- CHANGE THIS EMAIL
    user_uuid UUID;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = target_email;
    
    -- Check if user exists
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in authentication system', target_email;
    END IF;
    
    -- Update the user's role back to 'user'
    UPDATE public.profiles 
    SET 
        role = 'user',
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Check if update was successful
    IF FOUND THEN
        RAISE NOTICE 'Successfully revoked admin access for user %', target_email;
    ELSE
        RAISE EXCEPTION 'Failed to revoke admin access for %', target_email;
    END IF;
    
END $$;
*/
