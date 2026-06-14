-- Add enhanced profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS preferred_genres TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications": true, "review_mentions": true, "new_movie_alerts": false}'::jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_genres ON public.profiles USING GIN(preferred_genres);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_languages ON public.profiles USING GIN(preferred_languages);

-- Update existing profiles to have default values
UPDATE public.profiles 
SET 
  preferred_genres = '{}',
  preferred_languages = '{}',
  notification_preferences = '{"email_notifications": true, "review_mentions": true, "new_movie_alerts": false}'::jsonb
WHERE preferred_genres IS NULL OR preferred_languages IS NULL OR notification_preferences IS NULL;

-- Add RLS policy for users to update their own profile with new fields
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policy for users to insert their own profile with new fields
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
