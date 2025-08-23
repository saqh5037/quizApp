-- Create session_participants table
CREATE TABLE IF NOT EXISTS session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    nickname VARCHAR(255),
    score NUMERIC(5,2) DEFAULT 0,
    answers_correct INTEGER DEFAULT 0,
    answers_incorrect INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disconnected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_session_participants_status ON session_participants(status);

-- Add scheduled_for column to quiz_sessions if it doesn't exist
ALTER TABLE quiz_sessions 
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP;

-- Create participants table (alias for compatibility)
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    nickname VARCHAR(255),
    score NUMERIC(5,2) DEFAULT 0,
    answers_correct INTEGER DEFAULT 0,
    answers_incorrect INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disconnected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for participants table
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);