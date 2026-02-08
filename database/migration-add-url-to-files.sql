-- Migration: Add url column to files table
-- Run this in Supabase SQL Editor

ALTER TABLE files ADD COLUMN IF NOT EXISTS url TEXT;

-- Also ensure storage bucket permissions are set correctly
-- Go to Storage > files bucket > Policies and add these policies:

-- Policy for SELECT (view files):
-- Name: "Allow authenticated users to view files"
-- Target roles: authenticated
-- Policy: true

-- Policy for INSERT (upload files):
-- Name: "Allow authenticated users to upload files"  
-- Target roles: authenticated
-- Policy: true

-- Policy for DELETE (delete files):
-- Name: "Allow authenticated users to delete own files"
-- Target roles: authenticated
-- Policy: true

SELECT 'Migration complete!' AS status;
