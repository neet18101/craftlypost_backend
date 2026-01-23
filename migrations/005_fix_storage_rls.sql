-- Fix RLS policy for ugc-ads storage bucket
-- Run this in Supabase SQL Editor

-- OPTION 1: Allow everyone to upload (simpler for development)
CREATE POLICY "Allow public uploads to ugc-ads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ugc-ads');

-- Allow everyone to read
CREATE POLICY "Allow public read from ugc-ads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ugc-ads');

-- OPTION 2: Allow only authenticated users to upload (more secure)
-- Uncomment these and comment out OPTION 1 if you want authentication required

-- CREATE POLICY "Allow authenticated uploads to ugc-ads"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'ugc-ads' AND auth.uid() IS NOT NULL);

-- CREATE POLICY "Allow public read from ugc-ads"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'ugc-ads');

SELECT 'Storage policies created successfully!' AS status;
