# 🐘 Prompt para Migración a PostgreSQL - AristoTest

## 📋 INSTRUCCIONES DE USO:

1. **Copia todo el contenido debajo de "PROMPT PARA CLAUDE"**
2. **Pégalo en una nueva conversación de Claude**
3. **Claude generará todos los archivos necesarios**

---

## PROMPT PARA CLAUDE:

Necesito migrar mi aplicación de quizzes a PostgreSQL. Actualmente tengo un proyecto Node.js/Express con TypeScript para el backend y React para el frontend.

CONTEXTO TÉCNICO:
- Backend: Node.js + Express + TypeScript
- ORM: Sequelize 6.35
- Base de datos actual: SQLite
- Base de datos objetivo: PostgreSQL 14+
- Servidor: AWS con PostgreSQL ya instalado
- Nombre de BD: aristotest
- Usuario PostgreSQL: labsis
- Password: Labsis

YA cree la base de datos: aristotest

ESTRUCTURA ACTUAL DEL PROYECTO:
```
quiz-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── services/
│   └── server.ts
└── frontend/
```

NECESITO QUE GENERES:

1. **ARCHIVO: backend/src/config/database.ts**
Configuración completa de Sequelize para PostgreSQL con:
- Pool de conexiones optimizado
- Manejo de reconexión automática
- Logging condicional según ambiente
- SSL para producción
- Dialectos y opciones específicas de PostgreSQL

2. **ARCHIVO: backend/.env.example**
Con todas las variables de PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=labsis
DB_PASSWORD=Labsis
DB_DIALECT=postgres
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
DB_LOGGING=true
```

3. **SCRIPT SQL: backend/src/migrations/001_create_database.sql**
Script completo para crear la base de datos con:
```sql
-- Conectar a la base de datos
\c aristotest;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla organizations
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
    avatar_url TEXT,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Tabla quizzes
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    category VARCHAR(100),
    tags TEXT[],
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    estimated_time_minutes INTEGER,
    pass_percentage INTEGER DEFAULT 60,
    max_attempts INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    show_correct_answers BOOLEAN DEFAULT true,
    show_score BOOLEAN DEFAULT true,
    allow_review BOOLEAN DEFAULT true,
    time_limit_minutes INTEGER,
    instructions TEXT,
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    total_questions INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    times_taken INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Tabla questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'long_answer', 'fill_blank', 'matching', 'ordering')),
    question_image_url TEXT,
    explanation TEXT,
    hint TEXT,
    difficulty VARCHAR(20),
    points INTEGER DEFAULT 1,
    negative_points INTEGER DEFAULT 0,
    time_limit_seconds INTEGER,
    order_position INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answers JSONB NOT NULL DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla quiz_sessions
CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_code VARCHAR(8) UNIQUE NOT NULL,
    qr_code_url TEXT,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'paused', 'finished', 'cancelled')),
    mode VARCHAR(50) DEFAULT 'live' CHECK (mode IN ('live', 'self_paced', 'homework')),
    current_question_index INTEGER DEFAULT 0,
    current_question_started_at TIMESTAMPTZ,
    max_participants INTEGER DEFAULT 100,
    allow_late_joining BOOLEAN DEFAULT true,
    show_leaderboard BOOLEAN DEFAULT true,
    show_correct_after_each BOOLEAN DEFAULT false,
    nickname_generator BOOLEAN DEFAULT true,
    require_names BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    statistics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla participants
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    nickname VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    connection_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished', 'disconnected')),
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    unanswered INTEGER DEFAULT 0,
    time_taken_seconds INTEGER DEFAULT 0,
    rank_position INTEGER,
    bonus_points INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    device_info JSONB DEFAULT '{}',
    ip_address INET
);

-- Tabla answers
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    answer_value JSONB NOT NULL,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    answered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_quizzes_creator ON quizzes(creator_id);
CREATE INDEX idx_quizzes_organization ON quizzes(organization_id);
CREATE INDEX idx_quizzes_active ON quizzes(is_active) WHERE is_active = true;
CREATE INDEX idx_quizzes_deleted_at ON quizzes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_quiz ON questions(quiz_id);
CREATE INDEX idx_questions_order ON questions(quiz_id, order_position);
CREATE INDEX idx_sessions_code ON quiz_sessions(session_code);
CREATE INDEX idx_sessions_status ON quiz_sessions(status);
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_user ON participants(user_id);
CREATE INDEX idx_answers_participant ON answers(participant_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_answers_session ON answers(session_id);

-- Índices para búsqueda de texto completo
CREATE INDEX idx_quizzes_search ON quizzes USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_questions_search ON questions USING gin(to_tsvector('english', question_text));

-- Índices para JSONB
CREATE INDEX idx_quizzes_settings ON quizzes USING gin(settings);
CREATE INDEX idx_questions_options ON questions USING gin(options);
CREATE INDEX idx_quiz_sessions_statistics ON quiz_sessions USING gin(statistics);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_sessions_updated_at BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para generar códigos de sesión únicos
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Vistas útiles
CREATE VIEW active_quizzes AS
SELECT * FROM quizzes 
WHERE is_active = true AND deleted_at IS NULL;

CREATE VIEW recent_sessions AS
SELECT 
    qs.*,
    q.title as quiz_title,
    u.first_name || ' ' || u.last_name as host_name
FROM quiz_sessions qs
JOIN quizzes q ON qs.quiz_id = q.id
LEFT JOIN users u ON qs.host_id = u.id
WHERE qs.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY qs.created_at DESC;

-- Datos iniciales
INSERT INTO organizations (name, slug) VALUES 
('Demo Organization', 'demo-org');

INSERT INTO users (email, password, first_name, last_name, role, organization_id) VALUES
('admin@aristotest.com', '$2a$10$YourHashedPasswordHere', 'Admin', 'User', 'admin', 1),
('teacher@aristotest.com', '$2a$10$YourHashedPasswordHere', 'Teacher', 'Demo', 'teacher', 1),
('student@aristotest.com', '$2a$10$YourHashedPasswordHere', 'Student', 'Test', 'student', 1);
```

4. **MODELOS SEQUELIZE: backend/src/models/**
Genera todos los modelos con TypeScript:
- User.model.ts
- Organization.model.ts
- Quiz.model.ts
- Question.model.ts
- QuizSession.model.ts
- Participant.model.ts
- Answer.model.ts
- associations.ts

Cada modelo debe incluir:
- Tipos TypeScript completos
- Decoradores de Sequelize
- Validaciones
- Hooks (beforeCreate, beforeUpdate)
- Métodos de instancia
- Scopes

5. **ARCHIVO: backend/src/models/index.ts**
Archivo que inicializa Sequelize y exporta todos los modelos

6. **SCRIPT: backend/package.json scripts**
Agregar estos scripts:
```json
{
  "scripts": {
    "db:create": "node -e \"require('child_process').execSync('createdb aristotest')\"",
    "db:drop": "node -e \"require('child_process').execSync('dropdb aristotest --if-exists')\"",
    "db:migrate": "psql -U labsis -d aristotest -f src/migrations/001_create_database.sql",
    "db:seed": "ts-node src/seeders/seed.ts",
    "db:reset": "npm run db:drop && npm run db:create && npm run db:migrate && npm run db:seed",
    "db:backup": "pg_dump -U labsis aristotest > backup_$(date +%Y%m%d_%H%M%S).sql",
    "db:restore": "psql -U labsis aristotest < backup.sql"
  }
}
```

7. **SEEDER: backend/src/seeders/seed.ts**
Script para poblar la base de datos con data de prueba:
- 3 usuarios (admin, teacher, student)
- 5 quizzes de ejemplo
- 50 preguntas variadas
- Sesiones de ejemplo

8. **UTILIDADES: backend/src/utils/db.utils.ts**
Funciones helper para PostgreSQL:
- Manejo de transacciones
- Queries raw cuando sea necesario
- Backup y restore
- Conexión de prueba

9. **DOCKER COMPOSE: docker-compose.yml**
Para desarrollo local:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: labsis
      POSTGRES_PASSWORD: Labsis
      POSTGRES_DB: aristotest
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U labsis"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

10. **VALIDACIÓN Y TESTING: backend/src/tests/db.test.ts**
Tests para verificar:
- Conexión a PostgreSQL
- Creación de modelos
- Asociaciones
- Queries complejas
- Transacciones

CONSIDERACIONES IMPORTANTES:
1. Usar TIMESTAMPTZ en lugar de TIMESTAMP para zonas horarias
2. Implementar soft delete con deleted_at
3. Usar UUID como identificadores públicos
4. Mantener id SERIAL para relaciones internas
5. Aprovechar JSONB para datos flexibles
6. Implementar índices desde el inicio
7. Usar transacciones para operaciones múltiples
8. Configurar pool de conexiones apropiadamente

MANEJO DE ERRORES:
- Capturar errores específicos de PostgreSQL
- Reintentos automáticos en pérdida de conexión
- Logging detallado de queries en desarrollo
- Timeouts configurables

Por favor genera todos estos archivos con código completo, comentado y listo para producción.

---

## 🚀 DESPUÉS DE EJECUTAR EL PROMPT:

### Instalar dependencias:
```bash
cd backend
npm install pg pg-hstore
npm install -D @types/pg
```

### Configurar .env:
```env
# backend/.env
NODE_ENV=development
PORT=3001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=labsis
DB_PASSWORD=Labsis
DB_DIALECT=postgres
DB_LOGGING=true

# Pool
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# JWT
JWT_SECRET=tu_secret_key_super_segura
JWT_EXPIRES_IN=7d
```

### Ejecutar migraciones:
```bash
# Crear la base de datos (si no existe)
psql -U labsis -c "CREATE DATABASE aristotest;"

# Ejecutar migraciones
npm run db:migrate

# Poblar con datos de prueba
npm run db:seed

# Iniciar el servidor
npm run dev
```

## 📝 NOTAS IMPORTANTES:

- **Base de datos**: aristotest (todo en minúsculas)
- **Usuario**: labsis
- **Password**: Labsis
- **Puerto**: 5432 (default de PostgreSQL)
- **Host**: localhost (o tu servidor AWS)

## 🔍 VERIFICACIÓN:

Para verificar que todo funciona:
```bash
psql -U labsis -d aristotest -c "\dt"
```

Deberías ver todas las tablas creadas:
- organizations
- users
- quizzes
- questions
- quiz_sessions
- participants
- answers

---

**Archivo guardado como**: POSTGRESQL_MIGRATION_PROMPT.md