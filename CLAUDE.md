# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AristoTest is a multi-tenant interactive learning and assessment platform built with TypeScript, React, Node.js, and PostgreSQL. It features real-time quiz sessions using Socket.io, AI-powered content generation with Google Gemini, video streaming with MinIO, interactive video layers with auto-evaluation, PDF manual processing, and comprehensive quiz management capabilities.

## Development Commands

### Backend
```bash
cd backend
npm install               # Install dependencies
npm run dev              # Start development server with hot reload (port 3001)
npm run build            # Build TypeScript using Babel (production)
npm run build-tsc        # Build TypeScript using tsc compiler (type checking)
npm run start            # Start production server
npm run start:prod       # Start with PM2 process manager
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run lint             # Run ESLint on TypeScript files
npm run format           # Format code with Prettier
npm run migrate          # Run Sequelize database migrations
npm run seed             # Seed database with demo data
npm run db:reset         # Drop, create, migrate and seed database

# Run single test file
npm test -- tests/auth.spec.ts
npm test -- --coverage   # Generate coverage report
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start Vite dev server with host network access (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build
npm run test             # Run Vitest tests
npm run test:ui          # Run tests with UI interface
npm run lint             # Run ESLint on TypeScript/TSX files
npm run format           # Format code with Prettier

# Run single test file
npm test -- src/pages/Login.test.tsx
npm test -- --coverage   # Generate coverage report
```

### Database Commands
```bash
# Connect to database
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost

# Check connectivity
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "\l"

# Common queries with password
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM tenants;"
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM users;"
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM classrooms;"
```

### MinIO Storage
```bash
cd backend
./scripts/start-minio.sh                  # Start MinIO server
pm2 start ecosystem.config.js --only minio # Start with PM2

# Access points:
# API: http://localhost:9000
# Console: http://localhost:9001
# Credentials: aristotest/AristoTest2024!
```

### PM2 Process Management
```bash
pm2 start ecosystem.config.js              # Start backend + MinIO (local)
pm2 start ecosystem.prod.config.js         # Production with AWS RDS
pm2 logs aristotest-backend                # View backend logs
pm2 restart all                            # Restart all processes
```

## Architecture Overview

### Backend Architecture
- **Express Server**: Main HTTP server with middleware pipeline (helmet, cors, compression, rate limiting)
- **Socket.io Server**: Real-time WebSocket communication for quiz sessions
- **Database**: PostgreSQL with Sequelize ORM, multi-tenant architecture with tenant isolation
- **Authentication**: JWT-based with access and refresh tokens, role-based access control
- **AI Integration**: Google Gemini API for content generation, quiz creation, and interactive video questions
- **Storage**: MinIO S3-compatible storage for videos and files
- **Video Processing**: FFmpeg for transcoding and HLS streaming (360p, 480p, 720p)
- **File Structure**:
  - Controllers handle HTTP requests and business logic (including AI controllers)
  - Models define database schemas using Sequelize with tenant isolation
  - Routes organize API endpoints by domain (auth, quiz, session, ai, manual, video, interactive-video) with integrated express-validator validation
  - Socket handlers manage real-time events separately
  - Middleware provides auth, tenant isolation, validation, rate limiting, and error handling
  - Services contain business logic (Gemini AI, MinIO storage, FFmpeg video processing, video transcription)

### Frontend Architecture
- **React SPA**: Built with Vite, using React Router for navigation
- **State Management**: Zustand stores for auth, quiz, session, and tenant context
- **Real-time**: Socket.io-client for live quiz participation
- **Data Fetching**: React Query/Axios for server state management
- **Styling**: Tailwind CSS with custom components
- **Form Handling**: React Hook Form with validation
- **Media**: Video.js for video playback with HLS support
- **Charts**: Chart.js and Recharts for data visualization
- **Key Pages**: Dashboard, Quiz management, Session hosting, Quiz playing, Video library with interactive layers, Manual management with AI chat, Classrooms, Training programs

### Real-time Flow
1. Host creates session → generates unique session code and QR
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
- **InteractiveVideoLayer**: AI-generated questions that pause video at timestamps
- **InteractiveVideoResult**: Results from interactive video sessions

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
- Video has one InteractiveVideoLayer, many InteractiveVideoResults
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
- `/interactive-video/*` - Interactive video layers and AI generation
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
- JWT: JWT_SECRET and JWT_REFRESH_SECRET with configurable expiration
- Redis: REDIS_HOST and REDIS_PORT for caching (optional)
- CORS: Allowed origins (CORS_ORIGIN, SOCKET_CORS_ORIGIN)
- Rate limiting: Request limits (RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)
- AI: GEMINI_API_KEY for Google Gemini integration
- Storage: MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME
- File uploads: MAX_FILE_SIZE (default 5MB), UPLOAD_DIR
- Session: SESSION_SECRET, SESSION_MAX_AGE
- QR: QR_BASE_URL for generating join codes

### Frontend (.env)
- VITE_API_URL: Backend endpoint (e.g., http://localhost:3001)
- VITE_SOCKET_URL: WebSocket endpoint

## Testing Approach

### Backend
- Jest with ts-jest for TypeScript support
- Test files in `/backend/tests`
- Coverage reports in `/backend/coverage`
- Path aliases configured for clean imports
- Commands:
  ```bash
  npm test                                # Run all tests
  npm run test:watch                      # Run tests in watch mode
  npm test -- tests/auth.spec.ts          # Run single test file
  npm test -- --coverage                  # Generate coverage report
  ```
- Note: Test setup file (`tests/setup.ts`) needs to be created for test environment configuration

### Frontend
- Vitest for unit and integration tests
- Testing Library for React components
- Interactive UI available with `npm run test:ui`
- Commands:
  ```bash
  npm test                                # Run all tests
  npm run test:ui                         # Run with UI interface
  npm test -- src/pages/Login.test.tsx    # Run single test file
  npm test -- --coverage                  # Generate coverage report
  ```

## Build Configuration

### Backend
- Development: Uses nodemon with ts-node and tsconfig-paths for hot reload
- Production build: Two options available:
  - `npm run build`: Uses Babel to transpile TypeScript (faster, used for production)
  - `npm run build-tsc`: Uses TypeScript compiler directly (for type checking)
- TypeScript configured with path aliases (@config, @models, @controllers, etc.)
- Target: ES2022, CommonJS modules

### Frontend
- Vite build system with React plugin
- Path aliases configured (@components, @pages, @hooks, etc.)
- Code splitting with manual chunks for optimization (vendor, socket, charts, forms)
- Development server runs on port 5173 with host network access
- Proxy configuration for API and WebSocket connections

## Key Technical Decisions

1. **TypeScript Throughout**: Strong typing for better IDE support and fewer runtime errors
2. **Multi-tenant Architecture**: Complete data isolation between organizations using tenant_id
3. **Sequelize ORM**: Database abstraction with automatic tenant filtering via hooks
4. **Socket.io**: Proven real-time communication with fallback support
5. **Google Gemini AI**: For content generation, quiz creation, and interactive video questions
6. **MinIO Storage**: S3-compatible object storage for videos and large files
7. **FFmpeg Integration**: Video transcoding for HLS adaptive streaming
8. **Zustand**: Lightweight state management without Redux boilerplate
9. **Vite**: Fast development builds with HMR and optimized production bundles
10. **Tailwind CSS**: Utility-first styling for rapid UI development
11. **JWT Auth**: Stateless authentication with refresh token rotation and role-based access
12. **PDF Processing**: pdf-parse for extracting text from manual uploads

## Key Development Tasks

### Multi-tenant Operations
- All models with tenant_id field are automatically filtered by tenant
- Use tenantMiddleware in routes to enforce tenant isolation
- Tenant context available in req.tenantId after auth

### AI Integration (Google Gemini)
- Set GEMINI_API_KEY in environment
- GeminiService methods:
  - generateQuiz(): Create quiz from manual content
  - generateInteractiveContent(): Create video interaction layers
  - chatWithManual(): Interactive Q&A about manuals
  - generateSummary(): Create manual summaries

### Adding New API Endpoint
1. Create controller in `/backend/src/controllers/`
2. Add route in `/backend/src/routes/` with express-validator
3. Apply middleware: authMiddleware, tenantMiddleware
4. Update frontend service in `/frontend/src/services/`
5. Add TypeScript types in both backend and frontend

### Database Migration
```bash
npx sequelize-cli migration:generate --name your-migration-name
# Edit file in /backend/migrations/
npm run migrate
# Update models in /backend/src/models/ and types in /backend/src/types/
```

## Role-Based Access Control

**User Roles**: super_admin (system-wide), tenant_admin (organization), instructor/teacher (content creation), student (quiz participation)

**Middleware**: superAdminOnly, tenantAdminOnly, instructorOnly, tenantMiddleware (automatic tenant isolation)

## Performance & Security

**Performance**: Socket.io WebSocket with polling fallback, rate limiting (100 req/15min), DB connection pooling (max: 10), React Query caching, compression middleware, MinIO HLS streaming, async video transcoding, lazy loading with code splitting

**Security**: Helmet.js headers, CORS with credentials, express-validator input validation, Sequelize parameterized queries, bcrypt password hashing (salt: 10), JWT auth with refresh tokens, tenant isolation at DB level, file type validation

## Deployment Information

### Local Development
- Backend runs on port 3001
- Frontend runs on port 5173
- PostgreSQL on port 5432
- MinIO API on port 9000, Console on port 9001

### Production Deployment (AWS)
- EC2 Instance: ec2-52-55-189-120.compute-1.amazonaws.com
- RDS Database: ec2-3-91-26-178.compute-1.amazonaws.com
- Database Name: aristotest1
- PM2 ecosystem files configured for both local and production environments

## Recent Features (v1.0.2-QA)

**Interactive Videos**: AI-generated questions at timestamps, auto-pause, transcription, progress tracking, QR sharing

**Multi-tenant**: Complete isolation, tenant branding, cross-tenant management for super admins, usage analytics

**AI Quiz Import**: Bulk import with validation, automatic answer index conversion, multiple question types