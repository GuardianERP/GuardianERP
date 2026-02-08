-- Guardian ERP Mobile - App Updates Table
-- This table stores version information for OTA updates

CREATE TABLE IF NOT EXISTS app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web', 'desktop')),
  download_url TEXT NOT NULL,
  release_notes TEXT,
  is_mandatory BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  min_supported_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_app_updates_platform_active 
ON app_updates(platform, is_active);

CREATE INDEX IF NOT EXISTS idx_app_updates_version 
ON app_updates(version);

-- Enable RLS
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read updates (needed for the app to check)
CREATE POLICY "Anyone can read app updates"
ON app_updates FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can insert/update
CREATE POLICY "Admins can manage app updates"
ON app_updates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Insert initial version record
INSERT INTO app_updates (version, platform, download_url, release_notes, is_mandatory, is_active)
VALUES 
  ('2.0.1', 'android', 'https://your-server.com/downloads/guardian-erp-2.0.1.apk', 
   'Initial mobile release with full ERP features, real-time sync, and cross-device notifications.', 
   FALSE, TRUE),
  ('2.0.1', 'ios', 'https://apps.apple.com/app/guardian-erp/id123456789', 
   'Initial mobile release with full ERP features, real-time sync, and cross-device notifications.', 
   FALSE, TRUE),
  ('2.0.1', 'desktop', 'https://github.com/guardian-systems/guardian-desktop-erp/releases/latest', 
   'Desktop version 2.0.1 with improved call handling and chat sync.', 
   FALSE, TRUE);

COMMENT ON TABLE app_updates IS 'Stores app version information for OTA updates across all platforms';
