# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AristoTest is a multi-tenant interactive assessment and learning platform, built with TypeScript, React, Node.js, and PostgreSQL. It features real-time quiz sessions using Socket.io, AI-powered content generation with Google Gemini, video streaming with MinIO, PDF manual processing, and comprehensive quiz management capabilities.

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
npm run lint              # Run ESLint on TypeScript files
npm run format            # Format code with Prettier
npm run migrate           # Run Sequelize database migrations
npm run seed              # Seed database with demo data
npm run db:reset          # Drop, create, migrate and seed database
```

### Frontend
```bash
cd frontend
npm install               # Install dependencies
npm run dev               # Start Vite dev server with host network access (port 5173)
npm run build             # Build for production
npm run preview           # Preview production build
npm run test              # Run Vitest tests
npm run test:ui           # Run tests with UI interface
npm run lint              # Run ESLint on TypeScript/TSX files
npm run format            # Format code with Prettier
```

### Database Commands (PostgreSQL)
```bash
# Connect to database (requires PGPASSWORD environment variable)
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost

# Common database queries
psql -c "SELECT * FROM tenants;"         # View all tenants
psql -c "SELECT * FROM users;"           # View all users
psql -c "SELECT * FROM classrooms;"      # View classrooms
psql -c "\dt"                             # List all tables
```

### MinIO Storage
```bash
# Start MinIO server (for video/file storage)
./scripts/start-minio.sh

# MinIO runs on:
# - API: http://localhost:9000
# - Console: http://localhost:9001
# - Default credentials: minioadmin/minioadmin
```

## Architecture Overview

### Backend Architecture
- **Express Server**: Main HTTP server with middleware pipeline (helmet, cors, compression, rate limiting)
- **Socket.io Server**: Real-time WebSocket communication for quiz sessions
- **Database**: PostgreSQL with Sequelize ORM, multi-tenant architecture with tenant isolation
- **Authentication**: JWT-based with access and refresh tokens, role-based access control
- **AI Integration**: Google Gemini API for content generation, quiz creation, and chat
- **Storage**: MinIO S3-compatible storage for videos and files
- **File Structure**:
  - Controllers handle HTTP requests and business logic (including AI controllers)
  - Models define database schemas using Sequelize with tenant isolation
  - Routes organize API endpoints by domain (auth, quiz, session, ai, manual, video)
  - Socket handlers manage real-time events separately
  - Middleware provides auth, tenant isolation, validation, rate limiting, and error handling
  - Services contain business logic (Gemini AI service for content generation)
  - Validators contain express-validator schemas for input validation

### Frontend Architecture
- **React SPA**: Built with Vite, using React Router for navigation
- **State Management**: Zustand stores for auth, quiz, and session state, tenant context
- **Real-time**: Socket.io-client for live quiz participation
- **Data Fetching**: React Query/Axios for server state management
- **Styling**: Tailwind CSS with custom components
- **Form Handling**: React Hook Form for validation
- **Media**: Video.js for video playback, PDF viewer for manuals
- **Key Pages**: Dashboard, Quiz management, Session hosting, Quiz playing, Video library, Manual management, AI chat, Classrooms

### Real-time Flow
1. Host creates session → generates unique session code
2. Participants join via code or QR → enter waiting room
3. Host controls session flow (start, pause, next question)
4. Participants receive questions in real-time
5. Answers submitted → instant scoring with speed bonus
6. Live leaderboard updates after each question
7. Final results exportable to Excel/PDF

## Database Schema

### Core Models (Multi-tenant)
- **Tenant**: Organization/company with settings and branding
- **User**: Teachers/hosts with authentication and tenant association
- **Quiz**: Quiz templates with settings (tenant-scoped)
- **Question**: Questions linked to quizzes (multiple choice, true/false, short answer)
- **QuizSession**: Active quiz instances with unique codes
- **Participant**: Session participants (authenticated or anonymous)
- **Answer**: Participant responses with scoring

### AI & Content Models
- **Manual**: PDF/document storage with extracted text
- **ManualChat**: Chat history with AI about manuals
- **ManualSummary**: AI-generated summaries of manuals
- **AIGeneratedQuiz**: Quizzes created by AI from manual content
- **Video**: Video content with streaming URLs

### Training & Education Models
- **Classroom**: Virtual classrooms with enrollment codes
- **ClassroomEnrollment**: Student enrollments in classrooms
- **TrainingProgram**: Structured training programs with quizzes
- **ProgramQuiz**: Association between programs and quizzes
- **Certificate**: Completion certificates for programs

### Model Associations
- Tenant has many Users, Quizzes, Manuals, Videos, Classrooms
- User belongs to Tenant, has many Quizzes, Videos, Manuals
- Quiz has many Questions, QuizSessions
- Manual has many ManualChats, ManualSummaries, AIGeneratedQuizzes
- Classroom has many ClassroomEnrollments
- TrainingProgram has many ProgramQuizzes

## API Structure

Base URL: `/api/v1`

### Main Endpoints
- `/auth/*` - Authentication (login, register, refresh, logout)
- `/quizzes/*` - Quiz CRUD operations (tenant-scoped)
- `/sessions/*` - Session management and results
- `/grading/*` - Automated grading system
- `/results/*` - Session results and reporting
- `/videos/*` - Video upload, streaming, management
- `/manuals/*` - Manual upload, processing, text extraction
- `/ai/*` - AI operations (chat, quiz generation, summaries)
- `/classrooms/*` - Classroom management and enrollment
- `/training-programs/*` - Training program management
- `/certificates/*` - Certificate generation and validation
- `/tenants/*` - Tenant management (super admin only)

### Socket Events
- Session: create_session, join_session, leave_session, start_session, end_session, pause_session, resume_session
- Quiz: next_question, previous_question, submit_answer, skip_question
- Results: show_results, hide_results, leaderboard_update

## Environment Configuration

### Backend (.env)
- Database: PostgreSQL connection (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
- JWT: JWT_SECRET and JWT_REFRESH_SECRET
- Redis: REDIS_HOST and REDIS_PORT for caching (optional)
- CORS: Allowed origins (CORS_ORIGIN)
- Rate limiting: Request limits (RATE_LIMIT_MAX_REQUESTS)
- AI: GEMINI_API_KEY for Google Gemini integration
- Storage: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
- File uploads: MAX_FILE_SIZE, UPLOAD_DIR

### Frontend (.env)
- VITE_API_URL: Backend endpoint (e.g., http://localhost:3001)
- VITE_SOCKET_URL: WebSocket endpoint

## Testing Approach

### Backend
- Jest with ts-jest for TypeScript support
- Test files in `/backend/tests`
- Coverage reports in `/backend/coverage`
- Path aliases configured for clean imports

### Frontend
- Vitest for unit and integration tests
- Testing Library for React components
- Interactive UI available with `npm run test:ui`

## Key Technical Decisions

1. **TypeScript Throughout**: Strong typing for better IDE support and fewer runtime errors
2. **Multi-tenant Architecture**: Complete data isolation between organizations using tenant_id
3. **Sequelize ORM**: Database abstraction with automatic tenant filtering via hooks
4. **Socket.io**: Proven real-time communication with fallback support
5. **Google Gemini AI**: For content generation, quiz creation, and interactive chat
6. **MinIO Storage**: S3-compatible object storage for videos and large files
7. **Zustand**: Lightweight state management without Redux boilerplate
8. **Vite**: Fast development builds with HMR
9. **Tailwind CSS**: Utility-first styling for rapid UI development
10. **JWT Auth**: Stateless authentication with refresh token rotation and role-based access
11. **PDF Processing**: pdf-parse for extracting text from manual uploads

## Common Development Tasks

### Multi-tenant Considerations
- All models with tenant_id field are automatically filtered by tenant
- Use tenantMiddleware in routes to enforce tenant isolation
- Super admin role can perform cross-tenant operations
- Tenant context is available in req.tenantId after auth

### Working with AI Features
1. Ensure GEMINI_API_KEY is set in environment
2. Use GeminiService for AI operations:
   - generateQuiz(): Create quiz from manual content
   - chatWithManual(): Interactive Q&A about manuals
   - generateSummary(): Create manual summaries
3. AI-generated content is stored in ai_generated_quizzes table

### Adding a New API Endpoint
1. Create controller in `/backend/src/controllers/`
2. Add route in `/backend/src/routes/`
3. Apply middleware: authMiddleware, tenantMiddleware
4. Update API documentation
5. Add frontend service in `/frontend/src/services/`

### Database Migration
1. Create migration: `npx sequelize-cli migration:generate --name your-migration-name`
2. Edit migration file in `/backend/migrations/`
3. Run migration: `npm run migrate`
4. Update models in `/backend/src/models/`
5. Update TypeScript types

## Role-Based Access Control

### User Roles
- **super_admin**: Dynamtek internal, full system access
- **tenant_admin**: Organization admin, manages tenant settings
- **admin**: Legacy admin role (being phased out)
- **instructor/teacher**: Can create quizzes, view results
- **student**: Can take quizzes, view own results

### Middleware Protection
- `superAdminOnly`: For system-wide operations
- `tenantAdminOnly`: For tenant management
- `instructorOnly`: For content creation
- `tenantMiddleware`: Automatic tenant isolation

## Performance Considerations

- Socket.io configured for WebSocket with polling fallback
- Rate limiting on API endpoints (100 requests per 15 minutes default)
- Database connection pooling configured (max: 10, min: 2)
- React Query/Axios caching for API responses
- Compression middleware for HTTP responses
- File upload limit configurable (default 5MB)
- MinIO for efficient video streaming
- Lazy loading for frontend routes

## Security Measures

- Helmet.js for security headers
- CORS properly configured with credentials
- Input validation with express-validator
- SQL injection prevention via Sequelize parameterized queries
- XSS protection through React
- Rate limiting on sensitive endpoints
- JWT secrets in environment variables
- Password hashing with bcrypt (salt rounds: 10)
- Tenant isolation enforced at database level
- File type validation for uploads