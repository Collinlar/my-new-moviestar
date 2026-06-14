-- Grant Admin Access to a User
-- 
-- Instructions:
-- 1. Replace 'user@example.com' with the actual email address
-- 2. Run this script in the Supabase SQL editor
-- 3. The user will be granted admin access

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
    
    -- Check if profile exists
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_uuid) THEN
        RAISE EXCEPTION 'User profile not found for email %', target_email;
    END IF;
    
    -- Update the user's role to admin
    UPDATE public.profiles 
    SET 
        role = 'admin',
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Check if update was successful
    IF FOUND THEN
        RAISE NOTICE 'Successfully granted admin access to %', target_email;
        
        -- Show the updated profile
        RAISE NOTICE 'User details:';
        PERFORM 
            RAISE NOTICE '  Email: %', target_email,
            RAISE NOTICE '  Role: admin',
            RAISE NOTICE '  Updated: %', now();
            
    ELSE
        RAISE EXCEPTION 'Failed to update user role for %', target_email;
    END IF;
    
END $$;
