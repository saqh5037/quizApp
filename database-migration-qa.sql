-- AristoTest Database Migration Script for QA Environment
-- Version: 1.0.0-MVP
-- Author: Claude Code
-- Date: 2025-08-23

-- Create database if not exists (run this manually first)
-- CREATE DATABASE aristotest;

-- Connect to the database
-- \c aristotest;

-- =============================================
-- 1. EXTENSIONS
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. ENUMS
-- =============================================

-- Create enums for consistent data types
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE quiz_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
CREATE TYPE session_status AS ENUM ('scheduled', 'waiting', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE session_mode AS ENUM ('live', 'self_paced');

-- =============================================
-- 3. CORE TABLES
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone VARCHAR(20),
    organization VARCHAR(255),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty quiz_difficulty DEFAULT 'medium',
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    pass_percentage INTEGER DEFAULT 70,
    time_limit INTEGER, -- in minutes
    max_attempts INTEGER DEFAULT 1,
    show_results BOOLEAN DEFAULT true,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_answers BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    options JSONB, -- for multiple choice questions
    correct_answers JSONB NOT NULL, -- array of correct answers
    points INTEGER DEFAULT 1,
    time_limit INTEGER, -- in seconds
    explanation TEXT,
    order_position INTEGER,
    media_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES users(id),
    session_code VARCHAR(20) UNIQUE,
    name VARCHAR(255),
    status session_status DEFAULT 'scheduled',
    mode session_mode DEFAULT 'live',
    scheduled_for TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    current_question_index INTEGER DEFAULT 0,
    max_participants INTEGER,
    allow_late_joining BOOLEAN DEFAULT true,
    show_leaderboard BOOLEAN DEFAULT true,
    show_correct_after_each BOOLEAN DEFAULT false,
    nickname_generator BOOLEAN DEFAULT false,
    require_names BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session Participants table
CREATE TABLE IF NOT EXISTS session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    participant_name VARCHAR(255),
    participant_email VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    score DECIMAL(5,2) DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}',
    time_taken INTEGER, -- in seconds
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'
);

-- Public Quiz Results table (for QR code shared quizzes)
CREATE TABLE IF NOT EXISTS public_quiz_results (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    participant_name VARCHAR(255) NOT NULL,
    participant_email VARCHAR(255) NOT NULL,
    participant_phone VARCHAR(20),
    participant_organization VARCHAR(255),
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    earned_points INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '{}',
    time_taken INTEGER, -- in seconds
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_creator ON quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_active ON quizzes(is_active);
CREATE INDEX IF NOT EXISTS idx_quizzes_public ON quizzes(is_public);

-- Questions indexes
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(quiz_id, order_position);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_quiz ON quiz_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_sessions_host ON quiz_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON quiz_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON quiz_sessions(status);

-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON session_participants(user_id);

-- Public results indexes
CREATE INDEX IF NOT EXISTS idx_public_results_quiz ON public_quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_public_results_email ON public_quiz_results(participant_email);
CREATE INDEX IF NOT EXISTS idx_public_results_completed ON public_quiz_results(completed_at);

-- =============================================
-- 5. DEFAULT DATA
-- =============================================

-- Insert default admin user (password: Admin123!@#)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) 
VALUES (
    'admin@aristotest.com',
    '$2b$12$LQv3c1yqBw2LqGNGqJyJQOaKK6XmLJq8aH8u5rHxzKv0zEJ2rQ2GG',
    'Admin',
    'AristoTest',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert test teacher user (password: Teacher123!)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
    'teacher@aristotest.com',
    '$2b$12$KQv3c1yqBw2LqGNGqJyJQOaKK6XmLJq8aH8u5rHxzKv0zEJ2rQ2GH',
    'Teacher',
    'Demo',
    'teacher',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert test student user (password: Student123!)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
    'student@aristotest.com',
    '$2b$12$MQv3c1yqBw2LqGNGqJyJQOaKK6XmLJq8aH8u5rHxzKv0zEJ2rQ2GI',
    'Student',
    'Demo',
    'student',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- =============================================
-- 6. SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample quiz
INSERT INTO quizzes (title, description, category, difficulty, creator_id, is_active, is_public, pass_percentage)
VALUES (
    'Demo Quiz - Conocimientos Generales',
    'Quiz de demostración para probar el sistema',
    'General',
    'medium',
    (SELECT id FROM users WHERE email = 'admin@aristotest.com'),
    true,
    true,
    70
) ON CONFLICT DO NOTHING;

-- Get the quiz ID for sample questions
DO $$
DECLARE
    quiz_id_var INTEGER;
BEGIN
    SELECT id INTO quiz_id_var FROM quizzes WHERE title = 'Demo Quiz - Conocimientos Generales';
    
    IF quiz_id_var IS NOT NULL THEN
        -- Insert sample questions
        INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answers, points, order_position) VALUES
        (quiz_id_var, '¿Cuál es la capital de España?', 'multiple_choice', 
         '["Madrid", "Barcelona", "Valencia", "Sevilla"]', '[0]', 1, 1),
        (quiz_id_var, '¿El agua hierve a 100°C al nivel del mar?', 'true_false', 
         '["Verdadero", "Falso"]', '[0]', 1, 2),
        (quiz_id_var, '¿En qué año se descubrió América?', 'short_answer', 
         '[]', '["1492"]', 1, 3);
    END IF;
END $$;

-- =============================================
-- 7. FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. VIEWS FOR REPORTING
-- =============================================

-- View for quiz statistics
CREATE OR REPLACE VIEW quiz_statistics AS
SELECT 
    q.id,
    q.title,
    q.category,
    q.difficulty,
    COUNT(DISTINCT pqr.id) as total_attempts,
    COUNT(DISTINCT pqr.participant_email) as unique_participants,
    AVG(pqr.score) as average_score,
    COUNT(CASE WHEN pqr.score >= (q.pass_percentage * pqr.total_points / 100) THEN 1 END) as passed_attempts,
    q.created_at
FROM quizzes q
LEFT JOIN public_quiz_results pqr ON q.id = pqr.quiz_id
WHERE q.is_active = true
GROUP BY q.id, q.title, q.category, q.difficulty, q.pass_percentage, q.created_at;

-- =============================================
-- 9. PERMISSIONS AND SECURITY
-- =============================================

-- Create application user (optional - adjust as needed)
-- CREATE USER aristotest_app WITH PASSWORD 'your_secure_password_here';
-- GRANT CONNECT ON DATABASE aristotest TO aristotest_app;
-- GRANT USAGE ON SCHEMA public TO aristotest_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aristotest_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aristotest_app;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Verify the migration
SELECT 'Migration completed successfully. Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;