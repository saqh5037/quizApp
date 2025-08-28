# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AristoTest is a multi-tenant interactive assessment and learning platform featuring real-time quiz sessions, AI-powered content generation with Google Gemini, video streaming, PDF manual processing, and comprehensive quiz management. Built with TypeScript throughout for type safety.

## Development Commands

### Backend
```bash
cd backend
npm install                # Install dependencies
npm run dev               # Start development server with hot reload (port 3001)
npm run build             # Build TypeScript using Babel
npm run build-tsc         # Build TypeScript using tsc compiler
npm run start             # Start production server
npm run start:prod        # Start with PM2 process manager
npm run test              # Run Jest tests
npm run test:watch        # Run tests in watch mode
npm run test -- path/to/test.spec.ts  # Run single test file
npm run lint              # Run ESLint on TypeScript files
npm run format            # Format code with Prettier
npm run migrate           # Run Sequelize database migrations
npm run seed              # Seed database with demo data
npm run db:reset          # Drop, create, migrate and seed database
npx sequelize-cli migration:generate --name migration-name  # Create new migration
```

### Frontend
```bash
cd frontend
npm install               # Install dependencies
npm run dev               # Start Vite dev server with host network access (port 5173)
HOST=0.0.0.0 npm run dev  # Expose to network for mobile testing
npm run build             # Build for production
npm run preview           # Preview production build
npm run test              # Run Vitest tests
npm run test:ui           # Run tests with UI interface
npm run test path/to/test.spec.tsx  # Run single test file
npm run lint              # Run ESLint on TypeScript/TSX files
npm run format            # Format code with Prettier
```

### Database Commands
```bash
# Connect to database
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost

# Common queries for debugging
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost -c "SELECT * FROM tenants;"
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost -c "SELECT * FROM users WHERE email='admin@aristotest.com';"
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost -c "\dt"  # List all tables
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost -c "\d table_name"  # Describe table
```

### MinIO Storage
```bash
# Start MinIO server
./backend/scripts/start-minio.sh

# MinIO endpoints
# API: http://localhost:9000
# Console: http://localhost:9001
# Credentials: aristotest / AristoTest2024!
```

### Deployment
```bash
# Deploy to AWS QA environment
./scripts/deploy-aws-qa.sh

# Deploy directly to AWS production
./scripts/deploy-direct-aws.sh

# Health check
./scripts/health-check.sh

# Note: For AWS deployment, ensure environment variables are configured:
# AWS credentials, EC2 instance details, and database connection strings
```

## Architecture Overview

### Backend Structure
```
backend/src/
├── controllers/      # HTTP request handlers with business logic
├── models/          # Sequelize models with tenant isolation
├── routes/          # API endpoint definitions
├── middleware/      # Auth, tenant, validation, rate limiting
├── services/        # Business logic (GeminiService for AI)
├── socket/          # Real-time event handlers
├── validators/      # Express-validator schemas
└── server.ts        # Entry point
```

Key middleware pipeline: helmet → cors → compression → rate limiting → auth → tenant isolation

### Frontend Structure
```
frontend/src/
├── pages/           # Route components
├── components/      # Reusable UI components
├── stores/          # Zustand state management
├── services/        # API client services
├── hooks/           # Custom React hooks
├── types/           # TypeScript definitions
└── App.tsx          # Root component with routing
```

### Real-time Flow
1. Host creates session → generates unique 6-digit code
2. Participants join via code/QR → WebSocket connection established
3. Host controls flow → Socket events broadcast to room
4. Participants submit answers → Server calculates score with speed bonus
5. Leaderboard updates → Broadcast to all participants
6. Session ends → Results stored, exportable to Excel/PDF

## Database Schema

### Multi-tenant Core
All models with `tenant_id` field are automatically filtered by tenant context via Sequelize hooks.

- **Tenant**: Organization with settings (id, name, type, is_active)
- **User**: Authentication + tenant association (tenant_id, email, role)
- **Quiz**: Quiz templates (tenant_id, creator_id, title, settings)
- **Question**: Quiz questions (quiz_id, type, question_text, options, correct_answers)
- **QuizSession**: Active sessions (quiz_id, host_id, session_code, status)
- **Participant**: Session participants (session_id, name, user_id)
- **Answer**: Responses with scoring (participant_id, question_id, answer, score)

### AI & Content
- **Manual**: PDF storage (tenant_id, file_path, extracted_text)
- **ManualChat**: AI conversations (manual_id, messages)
- **AIGeneratedQuiz**: AI-created quizzes (manual_id, quiz_data)
- **Video**: Video content (tenant_id, file_path, stream_url)
- **InteractiveVideoLayer**: AI-generated video overlays

### Education
- **Classroom**: Virtual classes (tenant_id, code, name)
- **ClassroomEnrollment**: Student enrollments
- **TrainingProgram**: Program structure
- **Certificate**: Completion certificates

## API Endpoints

Base: `/api/v1`

### Core Routes
- `/auth/*` - Login, register, refresh token, logout
- `/quizzes/*` - CRUD operations (tenant-scoped)
- `/sessions/*` - Create, join, manage sessions
- `/results/*` - Session results, analytics
- `/videos/*` - Upload, stream, manage videos
- `/manuals/*` - Upload PDFs, extract text
- `/ai/*` - Chat, quiz generation, summaries
- `/classrooms/*` - Classroom management
- `/tenants/*` - Super admin only

### Socket Events
```javascript
// Session management
'create_session', 'join_session', 'leave_session', 
'start_session', 'end_session', 'pause_session'

// Quiz flow
'next_question', 'previous_question', 'submit_answer'

// Results
'leaderboard_update', 'show_results'
```

## Environment Configuration

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=aristotest
DB_PASSWORD=AristoTest2024

# Auth
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# AI
GEMINI_API_KEY=your-gemini-api-key

# Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Testing

### Backend Testing
- Jest with ts-jest for TypeScript
- Test files in `/backend/tests`
- Path aliases configured (@models, @services, etc.)
- Setup file at `/backend/tests/setup.ts`

### Frontend Testing  
- Vitest with Testing Library
- Interactive UI with `npm run test:ui`
- Path aliases configured (@components, @pages, etc.)

## Key Technical Decisions

1. **Multi-tenant Architecture**: Complete data isolation using tenant_id with automatic Sequelize hooks
2. **TypeScript Throughout**: Strong typing, better IDE support, fewer runtime errors
3. **Real-time with Socket.io**: WebSocket with polling fallback for quiz sessions
4. **Google Gemini AI**: Content generation, quiz creation, interactive chat
5. **MinIO Storage**: S3-compatible object storage for videos/files
6. **JWT Authentication**: Stateless auth with refresh token rotation
7. **Zustand State Management**: Lightweight alternative to Redux
8. **Vite Build Tool**: Fast HMR, optimized production builds
9. **Sequelize ORM**: Database abstraction with migrations
10. **Express Middleware Pipeline**: Security headers, CORS, rate limiting, compression

## Common Development Tasks

### Working with Multi-tenancy
- All models with `tenant_id` are automatically filtered
- Tenant context available in `req.tenantId` after auth
- Use `tenantMiddleware` in routes for enforcement
- Super admin bypasses tenant filtering

### AI Integration
- Ensure `GEMINI_API_KEY` is set
- Use `gemini.service.ts` methods:
  - `generateQuiz()`: Create quiz from manual
  - `chatWithManual()`: Q&A about documents
  - `generateVideoContent()`: Interactive video layers
- AI responses stored in respective tables

### Adding New API Endpoint
1. Create controller in `/backend/src/controllers/`
2. Add route in `/backend/src/routes/`
3. Apply middleware stack: `authMiddleware, tenantMiddleware, validators`
4. Add service in `/frontend/src/services/`
5. Update TypeScript types in both backend and frontend

### Database Migration
```bash
cd backend
npx sequelize-cli migration:generate --name your-migration
# Edit migration in /backend/migrations/
npm run migrate
# Update model in /backend/src/models/
# Update TypeScript types
```

## Security Measures

- **Helmet.js**: Security headers
- **CORS**: Configured with credentials
- **Rate Limiting**: 100 requests/15 minutes default
- **Input Validation**: express-validator on all endpoints
- **SQL Injection Prevention**: Parameterized queries via Sequelize
- **Password Security**: bcrypt with 10 salt rounds
- **Tenant Isolation**: Database-level enforcement
- **File Validation**: Type checking on uploads
- **JWT Secrets**: Environment variables only

## Performance Optimizations

- Database connection pooling (max: 10, min: 2)
- React Query caching for API responses
- Compression middleware for HTTP responses
- Lazy loading for frontend routes
- Manual chunks in Vite build (vendor, socket, charts, forms)
- MinIO for efficient video streaming
- WebSocket for real-time updates instead of polling

## Role-Based Access Control

### Roles
- **super_admin**: Full system access, cross-tenant operations
- **tenant_admin**: Manage organization settings
- **instructor/teacher**: Create content, view results
- **student**: Take quizzes, view own results

### Middleware Protection
- `superAdminOnly`: System-wide operations
- `tenantAdminOnly`: Tenant management
- `instructorOnly`: Content creation
- `tenantMiddleware`: Automatic tenant isolation