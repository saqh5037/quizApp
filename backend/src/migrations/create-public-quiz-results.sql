-- Create table for storing public quiz results
CREATE TABLE IF NOT EXISTS public_quiz_results (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE SET NULL,
    participant_name VARCHAR(255) NOT NULL,
    participant_email VARCHAR(255) NOT NULL,
    participant_phone VARCHAR(50),
    participant_organization VARCHAR(255),
    answers JSONB NOT NULL DEFAULT '{}',
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    earned_points INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL,
    answered_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_public_quiz_results_quiz_id ON public_quiz_results(quiz_id);
CREATE INDEX idx_public_quiz_results_email ON public_quiz_results(participant_email);
CREATE INDEX idx_public_quiz_results_completed_at ON public_quiz_results(completed_at);
CREATE INDEX idx_public_quiz_results_score ON public_quiz_results(score);

-- Add column to track quiz attempts
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS times_taken INTEGER DEFAULT 0;

COMMENT ON TABLE public_quiz_results IS 'Stores results from public quiz attempts';
COMMENT ON COLUMN public_quiz_results.answers IS 'JSON object with question_id as key and answer as value';
COMMENT ON COLUMN public_quiz_results.score IS 'Percentage score (0-100)';
COMMENT ON COLUMN public_quiz_results.time_spent_seconds IS 'Total time spent on the quiz in seconds';