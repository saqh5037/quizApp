-- =============================================
-- Quiz App Database Schema - PostgreSQL
-- Version: 1.0.0
-- Description: Complete database schema for educational quiz application
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM TYPES
-- =============================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin', 
    'teacher',
    'student',
    'guest'
);

-- Question types enum
CREATE TYPE question_type AS ENUM (
    'multiple_choice',
    'true_false',
    'short_answer',
    'long_answer',
    'fill_blank',
    'matching',
    'ordering',
    'hotspot'
);

-- Difficulty levels enum
CREATE TYPE difficulty_level AS ENUM (
    'easy',
    'medium',
    'hard',
    'expert'
);

-- Session status enum
CREATE TYPE session_status AS ENUM (
    'waiting',
    'in_progress',
    'paused',
    'completed',
    'cancelled'
);

-- Session mode enum
CREATE TYPE session_mode AS ENUM (
    'live',
    'self_paced',
    'homework'
);

-- Participant status enum
CREATE TYPE participant_status AS ENUM (
    'waiting',
    'playing',
    'finished',
    'disconnected'
);

-- Report type enum
CREATE TYPE report_type AS ENUM (
    'session_summary',
    'detailed_results',
    'question_analysis',
    'participant_report'
);

-- =============================================
-- TABLES
-- =============================================

-- Organizations table (for multi-tenancy support)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'student',
    avatar_url TEXT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Quizzes table
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(100),
    tags TEXT[],
    difficulty difficulty_level,
    estimated_time_minutes INTEGER,
    pass_percentage INTEGER DEFAULT 60 CHECK (pass_percentage >= 0 AND pass_percentage <= 100),
    max_attempts INTEGER DEFAULT 1 CHECK (max_attempts > 0),
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    show_correct_answers BOOLEAN DEFAULT true,
    show_score BOOLEAN DEFAULT true,
    allow_review BOOLEAN DEFAULT true,
    time_limit_minutes INTEGER,
    instructions TEXT,
    settings JSONB DEFAULT '{
        "allowBackNavigation": false,
        "showQuestionNumbers": true,
        "showProgressBar": true,
        "autoSubmit": false,
        "preventCopy": false,
        "fullScreenMode": false,
        "webcamMonitoring": false
    }',
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    total_questions INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    times_taken INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    question_image_url TEXT,
    explanation TEXT,
    hint TEXT,
    difficulty difficulty_level,
    points INTEGER DEFAULT 1 CHECK (points >= 0),
    negative_points INTEGER DEFAULT 0 CHECK (negative_points >= 0),
    time_limit_seconds INTEGER,
    order_position INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answers JSONB NOT NULL DEFAULT '[]',
    validation_rules JSONB DEFAULT '{
        "case_sensitive": false,
        "trim_spaces": true,
        "accept_synonyms": true,
        "regex_pattern": null
    }',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for question order within a quiz
    CONSTRAINT unique_question_order UNIQUE (quiz_id, order_position)
);

-- Question Bank table (for reusable questions)
CREATE TABLE question_bank (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    question_data JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Sessions table
CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_code VARCHAR(8) UNIQUE NOT NULL,
    qr_code_url TEXT,
    name VARCHAR(255),
    status session_status DEFAULT 'waiting',
    mode session_mode DEFAULT 'live',
    current_question_index INTEGER DEFAULT 0,
    current_question_started_at TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER DEFAULT 100 CHECK (max_participants > 0),
    allow_late_joining BOOLEAN DEFAULT true,
    show_leaderboard BOOLEAN DEFAULT true,
    show_correct_after_each BOOLEAN DEFAULT false,
    nickname_generator BOOLEAN DEFAULT true,
    require_names BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    statistics JSONB DEFAULT '{
        "total_participants": 0,
        "completed_participants": 0,
        "average_score": 0,
        "highest_score": 0,
        "lowest_score": 0,
        "average_time_seconds": 0
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    nickname VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    connection_id VARCHAR(255),
    status participant_status DEFAULT 'waiting',
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    unanswered INTEGER DEFAULT 0,
    time_taken_seconds INTEGER DEFAULT 0,
    rank_position INTEGER,
    bonus_points INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    
    -- Unique constraint: one nickname per session
    CONSTRAINT unique_session_nickname UNIQUE (session_id, nickname)
);

-- Answers table
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    answer_value JSONB NOT NULL,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one answer per participant per question per attempt
    CONSTRAINT unique_participant_question_attempt UNIQUE (participant_id, question_id, attempt_number)
);

-- Leaderboard Entries table (for historical tracking)
CREATE TABLE leaderboard_entries (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score INTEGER NOT NULL,
    correct_answers INTEGER,
    time_taken_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Reports table
CREATE TABLE quiz_reports (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    report_type report_type NOT NULL,
    file_url TEXT,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================

-- Performance indexes for users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Performance indexes for quizzes
CREATE INDEX idx_quizzes_creator ON quizzes(creator_id);
CREATE INDEX idx_quizzes_organization ON quizzes(organization_id);
CREATE INDEX idx_quizzes_active ON quizzes(is_active) WHERE is_active = true;
CREATE INDEX idx_quizzes_public ON quizzes(is_public) WHERE is_public = true;
CREATE INDEX idx_quizzes_category ON quizzes(category);
CREATE INDEX idx_quizzes_deleted ON quizzes(deleted_at) WHERE deleted_at IS NULL;

-- Performance indexes for questions
CREATE INDEX idx_questions_quiz ON questions(quiz_id);
CREATE INDEX idx_questions_order ON questions(quiz_id, order_position);
CREATE INDEX idx_questions_type ON questions(question_type);

-- Performance indexes for sessions
CREATE INDEX idx_sessions_code ON quiz_sessions(session_code);
CREATE INDEX idx_sessions_quiz ON quiz_sessions(quiz_id);
CREATE INDEX idx_sessions_host ON quiz_sessions(host_id);
CREATE INDEX idx_sessions_status ON quiz_sessions(status);
CREATE INDEX idx_sessions_created ON quiz_sessions(created_at);

-- Performance indexes for participants
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_connection ON participants(connection_id);

-- Performance indexes for answers
CREATE INDEX idx_answers_participant ON answers(participant_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_answers_correct ON answers(is_correct);

-- Full text search indexes
CREATE INDEX idx_quizzes_search ON quizzes 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_questions_search ON questions 
    USING gin(to_tsvector('english', question_text));

-- JSONB indexes for frequent queries
CREATE INDEX idx_quizzes_settings ON quizzes USING gin(settings);
CREATE INDEX idx_quizzes_metadata ON quizzes USING gin(metadata);
CREATE INDEX idx_questions_options ON questions USING gin(options);
CREATE INDEX idx_questions_correct ON questions USING gin(correct_answers);
CREATE INDEX idx_users_metadata ON users USING gin(metadata);

-- Array indexes
CREATE INDEX idx_quizzes_tags ON quizzes USING gin(tags);
CREATE INDEX idx_question_bank_tags ON question_bank USING gin(tags);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(8) := '';
    i INTEGER;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM quiz_sessions WHERE session_code = result) THEN
            RETURN result;
        END IF;
        
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique session code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update quiz statistics after session ends
CREATE OR REPLACE FUNCTION update_quiz_statistics()
RETURNS TRIGGER AS $$
DECLARE
    avg_score DECIMAL(5,2);
    total_taken INTEGER;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Calculate average score from this session
        SELECT AVG(p.score) INTO avg_score
        FROM participants p
        WHERE p.session_id = NEW.id AND p.status = 'finished';
        
        -- Update quiz statistics
        UPDATE quizzes
        SET times_taken = times_taken + 1,
            average_score = (
                (COALESCE(average_score, 0) * times_taken + COALESCE(avg_score, 0)) / 
                (times_taken + 1)
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.quiz_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_stats_on_session_complete
    AFTER UPDATE ON quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION update_quiz_statistics();

-- Function to calculate participant rank
CREATE OR REPLACE FUNCTION calculate_participant_ranks(session_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    WITH ranked_participants AS (
        SELECT 
            id,
            RANK() OVER (ORDER BY score DESC, time_taken_seconds ASC) as rank
        FROM participants
        WHERE session_id = session_id_param
            AND status IN ('playing', 'finished')
    )
    UPDATE participants p
    SET rank_position = rp.rank
    FROM ranked_participants rp
    WHERE p.id = rp.id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate question options based on type
CREATE OR REPLACE FUNCTION validate_question_options()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate multiple choice questions
    IF NEW.question_type = 'multiple_choice' THEN
        IF jsonb_array_length(NEW.options) < 2 THEN
            RAISE EXCEPTION 'Multiple choice questions must have at least 2 options';
        END IF;
    END IF;
    
    -- Validate true/false questions
    IF NEW.question_type = 'true_false' THEN
        NEW.options := '[
            {"id": "true", "text": "True", "is_correct": false},
            {"id": "false", "text": "False", "is_correct": false}
        ]'::jsonb;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_question_options_trigger
    BEFORE INSERT OR UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION validate_question_options();

-- Function to auto-update question count in quiz
CREATE OR REPLACE FUNCTION update_quiz_question_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE quizzes 
        SET total_questions = total_questions + 1,
            total_points = total_points + NEW.points
        WHERE id = NEW.quiz_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE quizzes 
        SET total_questions = total_questions - 1,
            total_points = total_points - OLD.points
        WHERE id = OLD.quiz_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.points != OLD.points THEN
        UPDATE quizzes 
        SET total_points = total_points - OLD.points + NEW.points
        WHERE id = NEW.quiz_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_counts
    AFTER INSERT OR DELETE OR UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_quiz_question_count();

-- =============================================
-- PERMISSIONS (adjust based on your needs)
-- =============================================

-- Create roles
CREATE ROLE quiz_app_read;
CREATE ROLE quiz_app_write;
CREATE ROLE quiz_app_admin;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO quiz_app_read;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO quiz_app_write;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quiz_app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quiz_app_admin;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE users IS 'Stores all user accounts with authentication and profile information';
COMMENT ON TABLE organizations IS 'Organizations for multi-tenancy support';
COMMENT ON TABLE quizzes IS 'Main quiz definitions with settings and metadata';
COMMENT ON TABLE questions IS 'Individual questions belonging to quizzes';
COMMENT ON TABLE question_bank IS 'Reusable question templates for creating new quizzes';
COMMENT ON TABLE quiz_sessions IS 'Live or self-paced quiz sessions';
COMMENT ON TABLE participants IS 'Participants in quiz sessions';
COMMENT ON TABLE answers IS 'Individual answers submitted by participants';
COMMENT ON TABLE leaderboard_entries IS 'Historical leaderboard data for reporting';
COMMENT ON TABLE quiz_reports IS 'Generated reports for quiz sessions';

COMMENT ON COLUMN users.metadata IS 'Flexible JSON storage for user preferences and settings';
COMMENT ON COLUMN quizzes.settings IS 'Quiz behavior configuration (navigation, display, security)';
COMMENT ON COLUMN questions.options IS 'Question options in JSON format, structure varies by question type';
COMMENT ON COLUMN questions.correct_answers IS 'Correct answer(s) in JSON format, structure varies by question type';
COMMENT ON COLUMN quiz_sessions.statistics IS 'Real-time session statistics updated during gameplay';
COMMENT ON COLUMN participants.device_info IS 'Browser and device information for analytics';