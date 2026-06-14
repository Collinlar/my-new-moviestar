-- Add missing INSERT policies for movies and creators tables
-- These were missing from the original schema setup

-- Movies: Allow admins to insert movies
CREATE POLICY "Admins can insert movies" ON public.movies
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Movies: Allow admins to update movies
CREATE POLICY "Admins can update movies" ON public.movies
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Creators: Allow admins to insert creators
CREATE POLICY "Admins can insert creators" ON public.creators
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Creators: Allow admins to update creators
CREATE POLICY "Admins can update creators" ON public.creators
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'kofcollkcl100@gmail.com' OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
