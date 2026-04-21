-- Migration 009: Scheduling availability system
-- Adds tables for working hours, absences, and timezone support

-- Add timezone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo';

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Table for user working hours (configurable schedule)
CREATE TABLE IF NOT EXISTS user_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week)
);

-- Create indexes for working hours queries
CREATE INDEX IF NOT EXISTS idx_user_working_hours_user_id ON user_working_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_user_working_hours_day ON user_working_hours(day_of_week);
CREATE INDEX IF NOT EXISTS idx_user_working_hours_active ON user_working_hours(is_active) WHERE is_active = true;

-- Table for user absences (vacations, holidays, sick leave)
CREATE TABLE IF NOT EXISTS user_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  all_day BOOLEAN DEFAULT true,
  reason VARCHAR(50) CHECK (reason IN ('vacation', 'sick_leave', 'personal', 'holiday', 'training', 'other')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Create indexes for absences queries
CREATE INDEX IF NOT EXISTS idx_user_absences_user_id ON user_absences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_absences_date_range ON user_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_absences_reason ON user_absences(reason);

-- Add default working hours for existing users (Monday-Friday, 9am-6pm)
INSERT INTO user_working_hours (user_id, day_of_week, start_time, end_time, is_active)
SELECT
  u.id,
  d.day,
  '09:00:00'::TIME,
  '18:00:00'::TIME,
  true
FROM users u
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS d(day) -- Monday to Friday
WHERE NOT EXISTS (
  SELECT 1 FROM user_working_hours wh
  WHERE wh.user_id = u.id AND wh.day_of_week = d.day
);

-- Create function to check if a time slot is available
CREATE OR REPLACE FUNCTION is_time_slot_available(
  p_user_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_has_working_hours BOOLEAN;
  v_has_absence BOOLEAN;
  v_has_conflict BOOLEAN;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_start_time AT TIME ZONE 'UTC');
  v_start_date := DATE(p_start_time AT TIME ZONE 'UTC');
  v_end_date := DATE(p_end_time AT TIME ZONE 'UTC');

  -- Check if user has working hours for this day
  SELECT EXISTS (
    SELECT 1 FROM user_working_hours
    WHERE user_id = p_user_id
      AND day_of_week = v_day_of_week
      AND is_active = true
      AND start_time <= (p_start_time AT TIME ZONE 'UTC')::TIME
      AND end_time >= (p_end_time AT TIME ZONE 'UTC')::TIME
  ) INTO v_has_working_hours;

  IF NOT v_has_working_hours THEN
    RETURN false;
  END IF;

  -- Check if user has absence during this period
  SELECT EXISTS (
    SELECT 1 FROM user_absences
    WHERE user_id = p_user_id
      AND start_date <= v_end_date
      AND end_date >= v_start_date
  ) INTO v_has_absence;

  IF v_has_absence THEN
    RETURN false;
  END IF;

  -- Check for scheduling conflicts
  SELECT EXISTS (
    SELECT 1 FROM schedules
    WHERE owner_id = p_user_id
      AND (
        (start_at <= p_start_time AND end_at > p_start_time) OR
        (start_at < p_end_time AND end_at >= p_end_time) OR
        (start_at >= p_start_time AND end_at <= p_end_time)
      )
      AND status = 'scheduled'
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create view for available time slots
CREATE OR REPLACE VIEW available_time_slots AS
SELECT
  u.id as user_id,
  u.first_name || ' ' || u.last_name as user_name,
  d.date::DATE as available_date,
  wh.start_time,
  wh.end_time,
  wh.day_of_week
FROM users u
CROSS JOIN generate_series(
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  INTERVAL '1 day'
) as d(date)
INNER JOIN user_working_hours wh ON wh.user_id = u.id AND wh.day_of_week = EXTRACT(DOW FROM d.date) AND wh.is_active = true
LEFT JOIN user_absences a ON a.user_id = u.id AND d.date BETWEEN a.start_date AND a.end_date
WHERE a.id IS NULL -- No absences on this date
ORDER BY u.id, d.date, wh.start_time;