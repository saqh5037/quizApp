-- SQL Script to create Educational Resources tables
-- Run this on your remote database

-- Create study_guides table
CREATE TABLE IF NOT EXISTS study_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id INTEGER REFERENCES manuals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT 'Generando guía de estudio...',
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    estimated_time INTEGER DEFAULT 30,
    topics TEXT[],
    learning_objectives TEXT[],
    status VARCHAR(20) DEFAULT 'generating',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create flash_cards table
CREATE TABLE IF NOT EXISTS flash_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id INTEGER REFERENCES manuals(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    set_title VARCHAR(255) NOT NULL,
    cards JSONB DEFAULT '[]',
    total_cards INTEGER DEFAULT 0,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    categories TEXT[],
    status VARCHAR(20) DEFAULT 'generating',
    is_public BOOLEAN DEFAULT false,
    study_stats JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_guides_manual_id ON study_guides(manual_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_user_id ON study_guides(user_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_tenant_id ON study_guides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_status ON study_guides(status);
CREATE INDEX IF NOT EXISTS idx_study_guides_is_public ON study_guides(is_public);

CREATE INDEX IF NOT EXISTS idx_flash_cards_manual_id ON flash_cards(manual_id);
CREATE INDEX IF NOT EXISTS idx_flash_cards_user_id ON flash_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_flash_cards_tenant_id ON flash_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_flash_cards_status ON flash_cards(status);
CREATE INDEX IF NOT EXISTS idx_flash_cards_is_public ON flash_cards(is_public);

-- Add comments for documentation
COMMENT ON TABLE study_guides IS 'AI-generated study guides from manual content';
COMMENT ON TABLE flash_cards IS 'AI-generated flash card sets for interactive learning';

COMMENT ON COLUMN study_guides.difficulty_level IS 'beginner, intermediate, or advanced';
COMMENT ON COLUMN study_guides.status IS 'generating, ready, or failed';
COMMENT ON COLUMN flash_cards.cards IS 'JSON array of card objects with front, back, category, difficulty, tags, hints';
COMMENT ON COLUMN flash_cards.study_stats IS 'JSON object tracking user study statistics';

-- Grant permissions if needed (adjust role names as per your database)
-- GRANT ALL ON study_guides TO your_app_role;
-- GRANT ALL ON flash_cards TO your_app_role;