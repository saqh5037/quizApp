-- Add missing columns to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 30;

-- Update total_questions count for existing quizzes
UPDATE quizzes q
SET total_questions = (
    SELECT COUNT(*) 
    FROM questions 
    WHERE quiz_id = q.id
);

-- Add metadata column to users table for preferences
ALTER TABLE users
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add missing columns to quiz_sessions
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 30;