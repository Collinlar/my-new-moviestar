-- COMPLETE FIX: Create Profile + Fix RLS + Set Admin Role
-- Run this entire script in Supabase SQL Editor

-- Step 1: Check if profile exists for callmejd.01@gmail.com
DO $$
DECLARE
    target_email TEXT := 'callmejd.01@gmail.com';
    user_uuid UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get user ID
    SELECT id INTO user_uuid FROM auth.users WHERE email = target_email;
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE '❌ User not found';
        RETURN;
    END IF;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_uuid) INTO profile_exists;
    
    IF NOT profile_exists THEN
        RAISE NOTICE '📝 Creating profile for user...';
        INSERT INTO public.profiles (user_id, display_name, created_at, updated_at)
        VALUES (user_uuid, target_email, now(), now())
        ON CONFLICT (user_id) DO NOTHING;
        RAISE NOTICE '✅ Profile created';
    ELSE
        RAISE NOTICE '✅ Profile already exists';
    END IF;
    
    -- Set admin role
    UPDATE public.profiles 
    SET role = 'admin', updated_at = now()
    WHERE user_id = user_uuid;
    
    RAISE NOTICE '✅ Admin role set';
END $$;

-- Step 2: Fix RLS on profiles table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic profile display info" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Public profile info viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Limited public profile visibility" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view basic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles for management" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own username" ON public.profiles;

-- Step 3: Create simple, working policies

-- Allow authenticated users to view all profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Allow users to view their own profile (redundant but safe)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the fix
SELECT 
    au.email,
    p.display_name,
    p.role,
    p.id as profile_id
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE au.email = 'callmejd.01@gmail.com';

-- Success message
SELECT '✅ FIX COMPLETE - Profile should now be accessible!' as status;

