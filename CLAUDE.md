# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AristoTest is an interactive assessment and learning platform, built with TypeScript, React, Node.js, and PostgreSQL/SQLite. It features real-time quiz sessions using Socket.io, QR code generation for easy session joining, and comprehensive quiz management capabilities.

## Development Commands

### Backend
```bash
cd backend
npm install                # Install dependencies
npm run dev               # Start development server with hot reload
npm run build             # Build TypeScript to JavaScript
npm run test              # Run Jest tests
npm run test:watch        # Run tests in watch mode
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run migrate           # Run database migrations
npm run seed              # Seed database with demo data
npm run db:reset          # Reset database completely
```

### Frontend
```bash
cd frontend
npm install               # Install dependencies
npm run dev               # Start Vite dev server
npm run build             # Build for production
npm run preview           # Preview production build
npm run test              # Run Vitest tests
npm run test:ui           # Run tests with UI
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
```

### Docker Development
```bash
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
docker-compose logs -f    # View logs
```

## Architecture Overview

### Backend Architecture
- **Express Server**: Main HTTP server with middleware pipeline (helmet, cors, compression, rate limiting)
- **Socket.io Server**: Real-time WebSocket communication for quiz sessions
- **Database**: PostgreSQL with Sequelize ORM, supports SQLite for development
- **Authentication**: JWT-based with access and refresh tokens
- **File Structure**:
  - Controllers handle HTTP requests and business logic
  - Models define database schemas using Sequelize
  - Routes organize API endpoints by domain (auth, quiz, session)
  - Socket handlers manage real-time events separately
  - Middleware provides auth, validation, rate limiting, and error handling
  - Validators contain express-validator schemas for input validation

### Frontend Architecture
- **React SPA**: Built with Vite, using React Router for navigation
- **State Management**: Zustand stores for auth, quiz, and session state
- **Real-time**: Socket.io-client for live quiz participation
- **Data Fetching**: React Query for server state management
- **Styling**: Tailwind CSS with custom components
- **Form Handling**: React Hook Form for validation
- **Key Pages**: Dashboard, Quiz management, Session hosting, Quiz playing

### Real-time Flow
1. Host creates session → generates unique session code
2. Participants join via code or QR → enter waiting room
3. Host controls session flow (start, pause, next question)
4. Participants receive questions in real-time
5. Answers submitted → instant scoring with speed bonus
6. Live leaderboard updates after each question
7. Final results exportable to Excel/PDF

## Database Schema

### Core Models
- **User**: Teachers/hosts with authentication
- **Quiz**: Quiz templates with settings
- **Question**: Questions linked to quizzes (multiple choice, true/false, short answer)
- **QuizSession**: Active quiz instances with unique codes
- **Participant**: Session participants (authenticated or anonymous)
- **Answer**: Participant responses with scoring

### Model Associations
- User has many Quizzes
- Quiz has many Questions
- Quiz has many QuizSessions
- QuizSession has many Participants
- Participant has many Answers
- Question has many Answers

## API Structure

Base URL: `/api/v1`

### Main Endpoints
- `/auth/*` - Authentication (login, register, refresh, logout)
- `/quizzes/*` - Quiz CRUD operations
- `/sessions/*` - Session management and results
- `/grading/*` - Automated grading system
- `/results/*` - Session results and reporting

### Socket Events
- Session: create_session, join_session, leave_session, start_session, end_session, pause_session, resume_session
- Quiz: next_question, previous_question, submit_answer, skip_question
- Results: show_results, hide_results, leaderboard_update

## Environment Configuration

### Backend (.env)
- Database: PostgreSQL connection (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
- JWT: JWT_SECRET and JWT_REFRESH_SECRET
- Redis: REDIS_HOST and REDIS_PORT for caching (optional)
- CORS: Allowed origins
- Rate limiting: Request limits

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
2. **Sequelize ORM**: Database abstraction allowing PostgreSQL/SQLite flexibility
3. **Socket.io**: Proven real-time communication with fallback support
4. **Zustand**: Lightweight state management without Redux boilerplate
5. **Vite**: Fast development builds with HMR
6. **Tailwind CSS**: Utility-first styling for rapid UI development
7. **JWT Auth**: Stateless authentication with refresh token rotation
8. **Docker Compose**: Consistent development environment across teams

## Common Development Tasks

### Adding a New Question Type
1. Update Question model with new type enum
2. Create React component in `/frontend/src/components/quiz/QuestionTypes/`
3. Update question renderer to handle new type
4. Add validation logic in backend controller
5. Update scoring logic if needed

### Implementing New Socket Event
1. Add event constant to `/backend/src/config/constants.ts`
2. Create handler in `/backend/src/socket/handlers/`
3. Register event in `/backend/src/socket/socket.server.ts`
4. Add client-side listener in relevant React component
5. Update Socket types in both backend and frontend

### Database Changes
1. Create migration file in `/backend/src/migrations/`
2. Update Sequelize models
3. Run `npm run migrate` to apply changes
4. Update TypeScript types
5. Test with existing data

## Performance Considerations

- Socket.io configured for WebSocket with polling fallback
- Rate limiting on API endpoints (100 requests per 15 minutes default)
- Database connection pooling configured
- React Query caching for 5 minutes
- Compression middleware for HTTP responses
- File upload limit set to 5MB

## Security Measures

- Helmet.js for security headers
- CORS properly configured
- Input validation with express-validator
- SQL injection prevention via Sequelize
- XSS protection through React
- Rate limiting on sensitive endpoints
- JWT secrets in environment variables
- Password hashing with bcrypt