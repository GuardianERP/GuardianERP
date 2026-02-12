-- Guardian Desktop ERP - Meetings Migration
-- Run this SQL in your Supabase SQL Editor to add meetings functionality

-- ============================================
-- MEETINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  meeting_type VARCHAR(50) DEFAULT 'video', -- video, audio, in_person
  meeting_link TEXT,
  recurrence_rule TEXT, -- For recurring meetings (iCal format)
  participants JSONB DEFAULT '[]', -- [{user_id, status: invited/accepted/declined/tentative}]
  settings JSONB DEFAULT '{}', -- {mute_on_join, video_off_on_join, waiting_room, etc}
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MEETING PARTICIPANTS TABLE (for detailed tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'invited', -- invited, accepted, declined, tentative
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- ============================================
-- PERSONAL REMINDERS TABLE (Google Tasks style)
-- ============================================
CREATE TABLE IF NOT EXISTS personal_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, snoozed
  repeat_type VARCHAR(50), -- none, daily, weekly, monthly
  snooze_until TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  category VARCHAR(100), -- call, email, task, custom
  contact_info TEXT, -- phone number, email, etc for quick actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_user ON personal_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_time ON personal_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_status ON personal_reminders(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view meetings they organized or are invited to
CREATE POLICY "Users view own meetings" ON meetings
  FOR SELECT USING (
    organizer_id::text = auth.uid()::text OR
    id IN (SELECT meeting_id FROM meeting_participants WHERE user_id::text = auth.uid()::text)
  );

-- Policy: Users can create meetings
CREATE POLICY "Users create meetings" ON meetings
  FOR INSERT WITH CHECK (organizer_id::text = auth.uid()::text);

-- Policy: Organizers can update their meetings
CREATE POLICY "Organizers update meetings" ON meetings
  FOR UPDATE USING (organizer_id::text = auth.uid()::text);

-- Policy: Organizers can delete their meetings
CREATE POLICY "Organizers delete meetings" ON meetings
  FOR DELETE USING (organizer_id::text = auth.uid()::text);

-- Policy: Users can view their participation records
CREATE POLICY "Users view own participation" ON meeting_participants
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- Policy: Users can manage their own reminders
CREATE POLICY "Users manage own reminders" ON personal_reminders
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Apply trigger for updated_at
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_reminders_updated_at BEFORE UPDATE ON personal_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON meetings TO anon, authenticated;
GRANT ALL ON meeting_participants TO anon, authenticated;
GRANT ALL ON personal_reminders TO anon, authenticated;

SELECT 'Meetings and Personal Reminders tables created successfully!' AS message;
