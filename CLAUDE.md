# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AristoTest is a multi-tenant interactive learning and assessment platform built with TypeScript, React, Node.js, and PostgreSQL. It features real-time quiz sessions using Socket.io, AI-powered content generation with Google Gemini, video streaming with MinIO, interactive video layers with auto-evaluation, PDF manual processing, and comprehensive educational resource management including study guides and flash cards.

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
# Local Database Connection
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost

# QA/Production Database Connection (AWS RDS)
PGPASSWORD=',U8x=]N02SX4' psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com -d aristotest1

# Common queries
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM tenants;"
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM users;"
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM study_guides;"
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -c "SELECT * FROM flash_cards;"
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
pm2 start ecosystem.remote.js              # Remote production environment
pm2 logs aristotest-backend                # View backend logs
pm2 logs minio                             # View MinIO logs
pm2 restart all                            # Restart all processes
pm2 status                                 # Check process status
pm2 monit                                  # Monitor processes
```

### Deployment Scripts
```bash
# QA Environment Deployment
./deploy-qa-v2-option1-clean.sh    # Clean deployment (fresh install)
./deploy-qa-v2-option2-update.sh   # Update existing deployment
./deploy-qa-v2-option3-docker.sh   # Docker-based deployment

# Production deployment from GitHub
./deploy-aristotest-from-github.sh # Deploy from GitHub repository

# Fix deployment issues
./deploy-fix.sh                    # General deployment fixes
./fix-backend-final.sh              # Backend specific fixes
./fix-remote-backend.sh             # Remote backend fixes
./fix-typescript-issue.sh           # TypeScript compilation fixes
./emergency-restart.sh              # Emergency restart services
```

### Docker Development
```bash
docker-compose up -d        # Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose down         # Stop all services
docker-compose logs -f      # View logs
docker-compose ps          # Check container status
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
  - Controllers handle HTTP requests and business logic (23 controllers including AI controllers)
  - Models define database schemas using Sequelize with tenant isolation (28 models)
  - Routes organize API endpoints by domain
  - Socket handlers manage real-time events separately
  - Middleware provides auth, tenant isolation, validation, rate limiting, and error handling (7 middleware modules)
  - Services contain business logic (7 services: Gemini AI, MinIO storage, FFmpeg video processing, video transcription, tenant management)

### Frontend Architecture
- **React SPA**: Built with Vite, using React Router for navigation
- **State Management**: Zustand stores for auth, quiz, session, interactive video, and tenant context
- **Real-time**: Socket.io-client for live quiz participation
- **Data Fetching**: React Query/TanStack Query with Axios for server state management
- **Styling**: Tailwind CSS with glassmorphism components for educational resources
- **Form Handling**: React Hook Form with Zod validation
- **Media**: Video.js for video playback with HLS support
- **Charts**: Chart.js and Recharts for data visualization
- **Key Pages**: Dashboard, Quiz management, Session hosting, Quiz playing, Video library with interactive layers, Manual management with AI chat, Study guides, Flash cards, Classrooms, Training programs, Admin panel for super admins (60 pages total)

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
- **ManualSummary**: AI-generated summaries of manuals with status tracking
- **StudyGuide**: Structured study guides generated from manual content
- **FlashCard**: Interactive flash cards for learning and memorization
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
- Manual has many ManualChats, ManualSummaries, StudyGuides, FlashCards, AIGeneratedQuizzes
- ManualSummary belongs to Manual and User
- StudyGuide belongs to ManualSummary
- FlashCard belongs to ManualSummary
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
- `/manuals/:id/generate-summary` - Generate AI summary for manual
- `/manuals/:id/summaries` - List summaries for a manual
- `/manual-summaries/:id` - Get specific summary with study guide and flash cards
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

### Frontend
- Vitest for unit and integration tests
- Testing Library for React components
- Interactive UI available with `npm run test:ui`
- Test files for educational resources in `/frontend/src/pages/Manuals/`
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
10. **Tailwind CSS**: Utility-first styling with glassmorphism components for modern UI
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
  - generateSummary(): Create manual summaries with study guides and flash cards
  - generateStudyGuide(): Create structured study content from summaries
  - generateFlashCards(): Create interactive learning cards

### Educational Resources
- Manual summaries include auto-generated study guides and flash cards
- Study guides provide structured learning content with sections and key points
- Flash cards offer interactive Q&A format for memorization
- All resources are tenant-scoped and linked to original manual content

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
- Database User: labsis
- PM2 ecosystem files configured for both local and production environments

## Recent Features

**Educational Resources (v1.0.3)**: AI-generated study guides and flash cards from manual content, glassmorphism UI components, status tracking for generation process

**Interactive Videos (v1.0.2)**: AI-generated questions at timestamps, auto-pause, transcription, progress tracking, QR sharing

**Multi-tenant (v1.0.1)**: Complete isolation, tenant branding, cross-tenant management for super admins, usage analytics

**AI Quiz Import**: Bulk import with validation, automatic answer index conversion, multiple question types

## Project File Structure

```
quiz-app/
├── backend/
│   ├── src/
│   │   ├── config/        # Database, environment, constants configuration
│   │   ├── controllers/   # 23 controllers for business logic
│   │   ├── middleware/    # 7 middleware modules (auth, tenant, validation)
│   │   ├── models/        # 28 Sequelize models with associations
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # 7 business services (AI, storage, video)
│   │   ├── socket/        # WebSocket event handlers
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Helper functions
│   │   └── server.ts      # Entry point
│   ├── migrations/        # 18 database migrations
│   ├── tests/            # Jest test files
│   ├── storage/          # MinIO local storage data
│   └── ecosystem.remote.js  # PM2 remote configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # 60 page components including admin panel
│   │   ├── stores/        # Zustand state stores
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── App.tsx        # Main application component
│   └── public/           # Static assets
│
├── docker-compose.yml    # Docker development setup
├── ecosystem.config.js   # PM2 local configuration
├── ecosystem.prod.config.js  # PM2 production configuration
└── deploy-*.sh          # Deployment scripts
```