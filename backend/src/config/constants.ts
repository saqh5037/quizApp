export const CONSTANTS = {
  // Quiz Types
  QUIZ_TYPES: {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
    SHORT_ANSWER: 'short_answer',
  },
  
  // Session Status
  SESSION_STATUS: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
  },
  
  // Participant Status
  PARTICIPANT_STATUS: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    DISCONNECTED: 'disconnected',
    FINISHED: 'finished',
  },
  
  // Socket Events
  SOCKET_EVENTS: {
    // Connection
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    
    // Session Management
    CREATE_SESSION: 'create_session',
    JOIN_SESSION: 'join_session',
    LEAVE_SESSION: 'leave_session',
    START_SESSION: 'start_session',
    END_SESSION: 'end_session',
    PAUSE_SESSION: 'pause_session',
    RESUME_SESSION: 'resume_session',
    
    // Quiz Flow
    NEXT_QUESTION: 'next_question',
    PREVIOUS_QUESTION: 'previous_question',
    SUBMIT_ANSWER: 'submit_answer',
    SKIP_QUESTION: 'skip_question',
    
    // Real-time Updates
    PARTICIPANT_JOINED: 'participant_joined',
    PARTICIPANT_LEFT: 'participant_left',
    ANSWER_RECEIVED: 'answer_received',
    QUESTION_CHANGED: 'question_changed',
    SESSION_UPDATED: 'session_updated',
    LEADERBOARD_UPDATE: 'leaderboard_update',
    
    // Results
    SHOW_RESULTS: 'show_results',
    HIDE_RESULTS: 'hide_results',
    FINAL_RESULTS: 'final_results',
    
    // Errors
    ERROR: 'error',
    SESSION_ERROR: 'session_error',
  },
  
  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
  },
  
  // Time Limits (in seconds)
  TIME_LIMITS: {
    DEFAULT_QUESTION_TIME: 30,
    MAX_QUESTION_TIME: 300,
    MIN_QUESTION_TIME: 10,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  
  // File Upload
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  
  // Session Codes
  SESSION_CODE: {
    LENGTH: 6,
    CHARSET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Cache Keys
  CACHE_KEYS: {
    SESSION: 'session:',
    USER: 'user:',
    QUIZ: 'quiz:',
    LEADERBOARD: 'leaderboard:',
  },
  
  // Cache TTL (in seconds)
  CACHE_TTL: {
    SESSION: 3600, // 1 hour
    USER: 1800, // 30 minutes
    QUIZ: 3600, // 1 hour
    LEADERBOARD: 60, // 1 minute
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden resource',
    NOT_FOUND: 'Resource not found',
    INVALID_CREDENTIALS: 'Invalid email or password',
    SESSION_NOT_FOUND: 'Session not found',
    SESSION_ALREADY_STARTED: 'Session has already started',
    SESSION_FULL: 'Session is full',
    INVALID_SESSION_CODE: 'Invalid session code',
    QUESTION_NOT_FOUND: 'Question not found',
    QUIZ_NOT_FOUND: 'Quiz not found',
    USER_NOT_FOUND: 'User not found',
    INVALID_ANSWER: 'Invalid answer format',
    TIME_EXPIRED: 'Time has expired for this question',
    DUPLICATE_ENTRY: 'Duplicate entry',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error',
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'Registration successful',
    SESSION_CREATED: 'Session created successfully',
    SESSION_JOINED: 'Joined session successfully',
    ANSWER_SUBMITTED: 'Answer submitted successfully',
    QUIZ_CREATED: 'Quiz created successfully',
    QUIZ_UPDATED: 'Quiz updated successfully',
    QUIZ_DELETED: 'Quiz deleted successfully',
  },
} as const;

export type QuizType = typeof CONSTANTS.QUIZ_TYPES[keyof typeof CONSTANTS.QUIZ_TYPES];
export type SessionStatus = typeof CONSTANTS.SESSION_STATUS[keyof typeof CONSTANTS.SESSION_STATUS];
export type ParticipantStatus = typeof CONSTANTS.PARTICIPANT_STATUS[keyof typeof CONSTANTS.PARTICIPANT_STATUS];
export type UserRole = typeof CONSTANTS.USER_ROLES[keyof typeof CONSTANTS.USER_ROLES];