-- ============================================
-- GUARDIAN ERP - STORAGE BUCKET & POLICIES
-- Run this in Supabase SQL Editor to enable file uploads
-- ============================================

-- Step 1: Create the 'files' bucket if it doesn't exist
-- Note: You can also create this manually in Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  TRUE,  -- Make bucket public for reads
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;

-- Step 3: Create permissive policies for the 'files' bucket
-- Since Guardian ERP uses its own auth system (not Supabase Auth),
-- we need to allow operations for all users

-- Policy: Allow anyone to read files (for avatar display)
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'files');

-- Policy: Allow anyone to upload files
-- Note: In production, you might want to restrict this to authenticated users
-- through your application layer
CREATE POLICY "Allow all uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'files');

-- Policy: Allow anyone to update files
CREATE POLICY "Allow all updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'files');

-- Policy: Allow anyone to delete files
CREATE POLICY "Allow all deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'files');

-- ============================================
-- ALTERNATIVE: If above doesn't work, try this simpler approach
-- Uncomment and run if needed
-- ============================================

-- -- Make the bucket completely public (no RLS)
-- UPDATE storage.buckets SET public = true WHERE id = 'files';

-- ============================================
-- VERIFICATION: Check if policies are created
-- ============================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check bucket settings
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'files';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Storage policies created successfully!' AS message;
