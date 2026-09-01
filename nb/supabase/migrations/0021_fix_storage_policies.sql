-- Ensure post-media bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post media" ON storage.objects;

-- Policy: Authenticated users can upload to post-media
CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Policy: Users can update their own media
CREATE POLICY "Users can update their own post media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-media' AND auth.uid() = owner);

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete their own post media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media' AND auth.uid() = owner);

-- Policy: Public can view post media
CREATE POLICY "Public can view post media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');
