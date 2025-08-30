-- ============================================================================
-- AristoTest Database Setup Script
-- Database: aristotest1
-- Version: 1.0.3
-- ============================================================================

-- Connect to the database
\c aristotest1;

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS public;

-- Set search path
SET search_path TO public;

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSONB,
    correct_answer TEXT,
    points INTEGER DEFAULT 10,
    time_limit INTEGER,
    order_index INTEGER DEFAULT 0,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_code VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting',
    settings JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    score INTEGER DEFAULT 0,
    answers JSONB DEFAULT '[]',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- Video & Interactive Tables
-- ============================================================================

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    duration FLOAT,
    mime_type VARCHAR(100),
    thumbnail_url VARCHAR(500),
    stream_url VARCHAR(500),
    hls_playlist_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    is_public BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    processing_error TEXT,
    interactive_layer_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interactive video layers table
CREATE TABLE IF NOT EXISTS interactive_video_layers (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_progress INTEGER DEFAULT 0,
    processing_error TEXT,
    ai_generated_content JSONB,
    transcription_text TEXT,
    transcription_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to videos table
ALTER TABLE videos 
ADD CONSTRAINT fk_interactive_layer 
FOREIGN KEY (interactive_layer_id) 
REFERENCES interactive_video_layers(id) 
ON DELETE SET NULL;

-- Interactive video sessions table
CREATE TABLE IF NOT EXISTS interactive_video_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    layer_id INTEGER REFERENCES interactive_video_layers(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    watch_time_seconds INTEGER DEFAULT 0,
    total_pauses INTEGER DEFAULT 0
);

-- Interactive video answers table
CREATE TABLE IF NOT EXISTS interactive_video_answers (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES interactive_video_sessions(session_id) ON DELETE CASCADE,
    moment_id VARCHAR(255) NOT NULL,
    question_text TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    response_time_seconds INTEGER,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Interactive video results table
CREATE TABLE IF NOT EXISTS interactive_video_results (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    layer_id INTEGER REFERENCES interactive_video_layers(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_phone VARCHAR(50),
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    incorrect_answers INTEGER NOT NULL,
    passed BOOLEAN DEFAULT false,
    passing_score INTEGER DEFAULT 70,
    time_spent_seconds INTEGER,
    answers JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Manual & AI Tables
-- ============================================================================

-- Manuals table
CREATE TABLE IF NOT EXISTS manuals (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Manual chats table
CREATE TABLE IF NOT EXISTS manual_chats (
    id SERIAL PRIMARY KEY,
    manual_id INTEGER REFERENCES manuals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    response TEXT,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Manual summaries table
CREATE TABLE IF NOT EXISTS manual_summaries (
    id SERIAL PRIMARY KEY,
    manual_id INTEGER REFERENCES manuals(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    key_points JSONB,
    generated_by VARCHAR(50) DEFAULT 'ai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI generated quizzes table
CREATE TABLE IF NOT EXISTS ai_generated_quizzes (
    id SERIAL PRIMARY KEY,
    manual_id INTEGER REFERENCES manuals(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
    generation_prompt TEXT,
    generated_content JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'generated',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Classroom & Training Tables
-- ============================================================================

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enrollment_code VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Classroom enrollments table
CREATE TABLE IF NOT EXISTS classroom_enrollments (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    UNIQUE(classroom_id, student_id)
);

-- Training programs table
CREATE TABLE IF NOT EXISTS training_programs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_days INTEGER,
    passing_score INTEGER DEFAULT 70,
    certificate_template JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Program quizzes table
CREATE TABLE IF NOT EXISTS program_quizzes (
    id SERIAL PRIMARY KEY,
    program_id INTEGER REFERENCES training_programs(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT true,
    UNIQUE(program_id, quiz_id)
);

-- Certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    program_id INTEGER REFERENCES training_programs(id) ON DELETE CASCADE,
    certificate_code VARCHAR(50) UNIQUE NOT NULL,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    score INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_quizzes_tenant_id ON quizzes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_code ON quiz_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_videos_tenant_id ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_interactive_layers_video_id ON interactive_video_layers(video_id);
CREATE INDEX IF NOT EXISTS idx_interactive_sessions_layer_id ON interactive_video_sessions(layer_id);
CREATE INDEX IF NOT EXISTS idx_interactive_results_video_id ON interactive_video_results(video_id);
CREATE INDEX IF NOT EXISTS idx_manuals_tenant_id ON manuals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_tenant_id ON classrooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_enrollment_code ON classrooms(enrollment_code);

-- ============================================================================
-- Default Data
-- ============================================================================

-- Insert default tenant if not exists
INSERT INTO tenants (name, subdomain, settings, is_active)
SELECT 'Default Organization', 'default', '{"theme": "blue", "features": ["quiz", "video", "ai"]}', true
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE subdomain = 'default');

-- Insert admin user if not exists
INSERT INTO users (tenant_id, email, password, name, role, is_active)
SELECT 
    (SELECT id FROM tenants WHERE subdomain = 'default'),
    'admin@aristotest.com',
    '$2b$10$YourHashedPasswordHere', -- You'll need to update this with actual hashed password
    'Admin User',
    'super_admin',
    true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@aristotest.com');

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant permissions to the application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO labsis;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO labsis;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO labsis;

-- ============================================================================
-- Verification
-- ============================================================================

-- Show all tables
\dt

-- Show row counts
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Success message
\echo 'Database setup completed successfully!'