-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('uploads', 'uploads', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the uploads bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' 
    AND auth.role() = 'authenticated'
  );

-- Allow public access to view uploaded files
CREATE POLICY "Allow public access to view uploaded files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads'
  );

-- Allow users to update their own uploaded files
CREATE POLICY "Allow users to update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow admin to manage all files
CREATE POLICY "Allow admin to manage all files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'uploads' 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'kofcollkcl100@gmail.com'
    )
  );
