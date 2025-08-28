-- AristoTest QA Database Preparation Script
-- Database: aristotest on ec2-3-91-26-178.compute-1.amazonaws.com
-- User: labsis
-- Date: 2025-01-28

-- IMPORTANT: This script will prepare the database for AristoTest
-- It will preserve the database but create/update necessary tables

-- Connect to aristotest database
\c aristotest;

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO labsis;
GRANT ALL PRIVILEGES ON DATABASE aristotest TO labsis;

-- Set default search path
ALTER DATABASE aristotest SET search_path TO public;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up old test data (optional - uncomment if needed)
-- This will DELETE all existing data but preserve tables
/*
TRUNCATE TABLE 
    answers,
    participants, 
    quiz_sessions,
    questions,
    quizzes,
    interactive_video_results,
    interactive_video_layers,
    videos,
    manual_chats,
    manual_summaries,
    ai_generated_quizzes,
    manuals,
    classroom_enrollments,
    classrooms,
    program_quizzes,
    training_programs,
    certificates,
    users,
    tenants
    RESTART IDENTITY CASCADE;
*/

-- Create default tenant if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = 1) THEN
        INSERT INTO tenants (
            id, 
            name, 
            code, 
            settings, 
            is_active, 
            type,
            created_at, 
            updated_at
        ) VALUES (
            1,
            'AristoTest QA',
            'aristotest-qa',
            '{"theme": "default", "features": ["videos", "interactive", "ai"]}',
            true,
            'education',
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Create default admin user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@aristotest.com') THEN
        INSERT INTO users (
            email,
            password,
            name,
            role,
            tenant_id,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'admin@aristotest.com',
            '$2b$10$YNOoNE5XlXKFKqMZVOWqLeFLqaI5lM6HPZ5C3a9JVszMFWpHJoU3y', -- admin123
            'Admin QA',
            'super_admin',
            1,
            true,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Create test instructor user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'instructor@aristotest.com') THEN
        INSERT INTO users (
            email,
            password,
            name,
            role,
            tenant_id,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            'instructor@aristotest.com',
            '$2b$10$YNOoNE5XlXKFKqMZVOWqLeFLqaI5lM6HPZ5C3a9JVszMFWpHJoU3y', -- admin123
            'Instructor QA',
            'instructor',
            1,
            true,
            NOW(),
            NOW()
        );
    END IF;
END $$;

-- Verify tables exist (will be created by Sequelize migrations)
DO $$
BEGIN
    -- Check critical tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Table users does not exist - run migrations first';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'videos') THEN
        RAISE NOTICE 'Table videos does not exist - run migrations first';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interactive_video_layers') THEN
        RAISE NOTICE 'Table interactive_video_layers does not exist - run migrations first';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_tenant_id ON videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_interactive_layers_video_id ON interactive_video_layers(video_id);
CREATE INDEX IF NOT EXISTS idx_interactive_layers_status ON interactive_video_layers(processing_status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update sequences if needed
SELECT setval('tenants_id_seq', COALESCE((SELECT MAX(id) FROM tenants), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);

-- Show summary
DO $$
DECLARE
    table_count INTEGER;
    user_count INTEGER;
    video_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO video_count FROM videos;
    
    RAISE NOTICE 'Database Summary:';
    RAISE NOTICE '  Tables: %', table_count;
    RAISE NOTICE '  Users: %', user_count;
    RAISE NOTICE '  Videos: %', video_count;
END $$;

-- Grant final permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO labsis;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO labsis;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO labsis;