-- Fix is_admin function to avoid profiles table access
-- Replace with email-based check to avoid RLS policy issues

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (auth.jwt() ->> 'email')::text = 'kofcollkcl100@gmail.com';
$function$;
