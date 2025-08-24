-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de categorías de videos
CREATE TABLE IF NOT EXISTS video_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    parent_id INTEGER REFERENCES video_categories(id),
    order_position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla principal de videos
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    
    -- Local storage paths
    original_path VARCHAR(500),
    processed_path VARCHAR(500),
    hls_playlist_url TEXT,
    
    -- Metadata
    creator_id INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    category_id INTEGER REFERENCES video_categories(id),
    tags TEXT[],
    language VARCHAR(10) DEFAULT 'es',
    
    -- Estado y procesamiento
    status VARCHAR(50) DEFAULT 'draft', -- draft, uploading, processing, ready, error, archived
    processing_progress INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Configuración
    is_public BOOLEAN DEFAULT false,
    allow_download BOOLEAN DEFAULT false,
    requires_auth BOOLEAN DEFAULT true,
    linked_quiz_id INTEGER REFERENCES quizzes(id),
    
    -- Estadísticas
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    average_watch_time INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    
    -- SEO y metadata
    slug VARCHAR(255) UNIQUE,
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Resoluciones disponibles por video
CREATE TABLE IF NOT EXISTS video_qualities (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    quality VARCHAR(20), -- 360p, 480p, 720p, 1080p
    width INTEGER,
    height INTEGER,
    bitrate INTEGER,
    file_size_bytes BIGINT,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Capítulos del video
CREATE TABLE IF NOT EXISTS video_chapters (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time_seconds INTEGER NOT NULL,
    end_time_seconds INTEGER,
    thumbnail_url TEXT,
    order_position INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Transcripciones y subtítulos
CREATE TABLE IF NOT EXISTS video_transcriptions (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'es',
    type VARCHAR(50), -- 'auto', 'manual', 'professional'
    vtt_file_path TEXT,
    srt_file_path TEXT,
    full_text TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Progreso de visualización por usuario
CREATE TABLE IF NOT EXISTS video_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    watched_seconds INTEGER DEFAULT 0,
    total_watch_time INTEGER DEFAULT 0,
    last_position_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_watched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, video_id)
);

-- Notas del usuario en videos
CREATE TABLE IF NOT EXISTS video_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks/Marcadores
CREATE TABLE IF NOT EXISTS video_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER NOT NULL,
    title VARCHAR(255),
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id, timestamp_seconds)
);

-- Quiz overlays en puntos específicos
CREATE TABLE IF NOT EXISTS video_quiz_points (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id),
    question_id INTEGER REFERENCES questions(id),
    trigger_time_seconds INTEGER NOT NULL,
    pause_video BOOLEAN DEFAULT true,
    mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Analytics de visualización
CREATE TABLE IF NOT EXISTS video_analytics (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    event_type VARCHAR(50), -- play, pause, seek, complete, quality_change, error
    timestamp_seconds INTEGER,
    additional_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Playlists/Cursos
CREATE TABLE IF NOT EXISTS video_playlists (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    creator_id INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    is_course BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    total_duration_seconds INTEGER,
    video_count INTEGER DEFAULT 0,
    enrolled_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Videos en playlists
CREATE TABLE IF NOT EXISTS playlist_videos (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES video_playlists(id) ON DELETE CASCADE,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    order_position INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, video_id)
);

-- Comentarios en videos
CREATE TABLE IF NOT EXISTS video_comments (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES video_comments(id),
    comment_text TEXT NOT NULL,
    timestamp_seconds INTEGER,
    likes_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_slug ON videos(slug);
CREATE INDEX IF NOT EXISTS idx_videos_organization ON videos(organization_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_video_user ON video_notes(video_id, user_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_video ON video_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_session ON video_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_created ON video_analytics(created_at);

-- Insertar categorías por defecto
INSERT INTO video_categories (name, slug, description, icon, order_position) VALUES
('Capacitación', 'capacitacion', 'Videos de capacitación y entrenamiento', 'academic-cap', 1),
('Tutoriales', 'tutoriales', 'Tutoriales paso a paso', 'light-bulb', 2),
('Webinars', 'webinars', 'Webinars y conferencias grabadas', 'video-camera', 3),
('Documentación', 'documentacion', 'Videos de documentación y guías', 'document-text', 4),
('Casos de Estudio', 'casos-estudio', 'Análisis de casos reales', 'chart-bar', 5)
ON CONFLICT (slug) DO NOTHING;