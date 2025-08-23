# Changelog - AristoTest

## [1.1.0] - 2025-08-23

### Added
- 🌐 **Internationalization (i18n)**: Complete Spanish/English support with language switcher in Profile page
- 📖 **In-app Documentation**: Comprehensive documentation page at `/docs` with module descriptions and test instructions
- 🗄️ **Database Tables**: Created `session_participants` and `participants` tables for session management
- 🔧 **Environment Configuration**: Dynamic API configuration for QA/Production deployment readiness
- 📊 **Chart.js Integration**: Added data visualization capabilities for dashboard

### Fixed
- 🐛 **Database Errors**: Fixed missing `session_participants` table causing 500 errors
- 🔒 **Rate Limiter**: Increased limits from 100 to 10000 requests for development
- 🔗 **API Endpoints**: Fixed wrong session endpoint (`/my-sessions` → `/my`)
- 🚫 **NaN Warnings**: Added null checks in Quizzes component reduce functions
- 🌍 **CORS Configuration**: Updated to allow any origin in development mode
- 📊 **User Statistics**: Fixed stats and activity endpoints with proper SQL queries
- 🏷️ **Missing Columns**: Added `total_questions`, `time_limit_minutes`, and `metadata` columns

### Changed
- 🎨 **Logo Size**: Significantly increased logo size on login page for better branding
- 🌐 **Default Language**: Set Spanish as the default language
- 🔢 **Rate Limits**: Adjusted rate limiting for better development experience

### Technical Details

#### Database Migrations Applied:
```sql
-- Created session_participants table with proper indexes
-- Added scheduled_for column to quiz_sessions
-- Added metadata JSONB column to users table
-- Added total_questions and time_limit_minutes to quizzes
```

#### Configuration Updates:
- Centralized API configuration in `frontend/src/config/api.config.ts`
- Environment variables for deployment flexibility
- Dynamic CORS configuration based on environment

#### i18n Implementation:
- Complete translation files for Spanish and English
- Language preference saved in localStorage
- All UI components properly internationalized

### Known Issues (Documented)
- Password recovery not implemented
- Avatar upload functionality incomplete
- WebSocket for real-time sessions needs implementation
- Some test data needs to be populated

### Development Notes
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Default admin: admin@aristotest.com / Admin123!
- Default teacher: profesor@aristotest.com / Profesor123!
- Default student: estudiante@aristotest.com / Estudiante123!

---

## [1.0.0] - Initial Release
- Basic quiz application structure
- User authentication system
- Quiz creation and management
- Session hosting capabilities
- Results tracking