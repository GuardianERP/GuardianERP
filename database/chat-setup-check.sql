-- ============================================
-- Guardian ERP - Chat Tables Setup & Verification
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- ============================================

-- Step 1: Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_conversations', 'chat_messages');

-- Step 2: Disable RLS on chat tables (allows all operations)
-- This is the MOST COMMON cause of chat not working!
ALTER TABLE chat_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Step 3: Create chat_conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  type VARCHAR(20) DEFAULT 'direct',
  participants JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  read_by JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);
-- GIN index for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants ON chat_conversations USING GIN(participants);

-- Step 6: Grant full access to authenticated and anon users
GRANT ALL ON chat_conversations TO authenticated, anon;
GRANT ALL ON chat_messages TO authenticated, anon;

-- Step 7: Enable Realtime for chat tables (IMPORTANT for live updates!)
-- Go to Supabase Dashboard > Database > Replication and enable these tables
-- OR run this if you have access:
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Step 8: Verify chat_conversations can be queried with JSONB contains
-- Replace 'your-user-id-here' with an actual user UUID
-- SELECT * FROM chat_conversations WHERE participants @> '["your-user-id-here"]';

-- Step 9: Test insert (replace with actual user IDs)
-- INSERT INTO chat_conversations (participants, type) VALUES ('["user-id-1", "user-id-2"]', 'direct');

-- ============================================
-- VERIFICATION: After running the above, test these queries:
-- ============================================

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_conversations' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;

-- Check RLS status (should show FALSE for both if working)
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('chat_conversations', 'chat_messages');

-- Check existing conversations
SELECT id, type, name, participants, created_at FROM chat_conversations ORDER BY created_at DESC LIMIT 5;

-- Check existing messages
SELECT id, conversation_id, sender_id, content, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 5;
