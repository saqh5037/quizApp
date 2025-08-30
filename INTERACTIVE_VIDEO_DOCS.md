# Interactive Video System Documentation

## Overview
The Interactive Video System allows creating auto-evaluative video content with AI-generated questions that pause the video at specific timestamps. Students must answer questions to continue watching, with results tracked and reported.

## Architecture

### Frontend Components

#### 1. PublicInteractiveVideoPlayer
**Location**: `/frontend/src/components/videos/PublicInteractiveVideoPlayer.tsx`
- Main component for interactive video playback
- Handles mobile/desktop detection
- Manages fullscreen state
- Integrates with Zustand store for state management

#### 2. InteractiveOverlayEnhanced (Desktop)
**Location**: `/frontend/src/components/videos/InteractiveOverlayEnhanced.tsx`
- Desktop-optimized question overlay
- Rich UI with animations
- Supports multiple question types

#### 3. MobileInteractiveOverlay
**Location**: `/frontend/src/components/videos/MobileInteractiveOverlay.tsx`
- Mobile-optimized interface
- Large touch targets (60px min)
- Simplified UI for small screens
- Portal rendering for fullscreen compatibility

#### 4. PublicInteractiveVideoEnhanced
**Location**: `/frontend/src/pages/Videos/PublicInteractiveVideoEnhanced.tsx`
- Public view page
- Student identification form
- Session initialization

### State Management

#### Zustand Store
**Location**: `/frontend/src/stores/interactiveVideoStore.ts`

**Key Features**:
- Centralized state management
- Session tracking
- Question/answer management
- Results calculation
- LocalStorage persistence for backup

**Main Actions**:
```typescript
initializeSession(videoId, layerId, studentInfo) // Start new session
submitAnswer(answer) // Submit question answer
calculateResults() // Calculate final score
saveResults() // Save to backend with fallback
completeAndExit() // Finish and close window
```

### Backend Integration

#### API Endpoints
- `GET /api/v1/videos/:id/public-interactive` - Fetch public video data
- `POST /api/v1/interactive-video/public/:layerId/session/start` - Start session
- `POST /api/v1/interactive-video/public/session/:sessionId/answer` - Submit answer
- `POST /api/v1/interactive-video/public/session/:sessionId/complete` - Complete session
- `POST /api/v1/videos/:id/interactive-results` - Save final results

## User Flow

1. **Access**: Student accesses public video link or scans QR code
2. **Identification**: Enters name, email, optional phone
3. **Session Start**: System initializes session with backend
4. **Video Playback**: Video starts playing automatically
5. **Question Trigger**: Video pauses at predefined timestamps
6. **Answer Submission**: Student answers question
7. **Continue**: Video resumes after answer
8. **Completion**: All questions answered, video ends
9. **Results**: Final score calculated and saved
10. **Exit**: Window closes or shows completion message

## Question Types

- **Multiple Choice**: 2-6 options with single correct answer
- **True/False**: Binary choice questions
- **Short Answer**: Text input (planned, not yet implemented)

## Mobile Considerations

- Automatic device detection
- Touch-optimized UI with larger buttons
- Simplified interface for small screens
- Portal rendering for fullscreen compatibility
- Reduced animations for performance

## Data Storage

### Frontend
- Zustand persist middleware for session recovery
- LocalStorage backup for failed saves
- Multiple fallback keys for redundancy

### Backend
- PostgreSQL tables:
  - `interactive_video_layers` - Question content
  - `interactive_video_results` - Student results
  - `interactive_video_answers` - Individual answers
  - `interactive_video_sessions` - Session tracking

## Error Handling

1. **Network Failures**: LocalStorage backup with retry
2. **Invalid Data**: Validation at form and API level
3. **Session Loss**: Persist middleware for recovery
4. **Window Closing**: Multiple fallback methods

## Performance Optimizations

- Lazy loading of components
- Memoized calculations
- Debounced time updates
- Efficient re-renders with Zustand

## Known Limitations

1. Mobile fullscreen questions may not display correctly on some devices
2. Short answer questions not yet implemented
3. No offline mode (requires connection for video streaming)
4. Results page requires manual refresh to see new entries

## Deployment Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database running
- [ ] MinIO server configured
- [ ] Google Gemini API key set

### Environment Variables
```bash
# Backend
GEMINI_API_KEY=your_key
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
DB_HOST=localhost
DB_PORT=5432
DB_USER=aristotest
DB_PASSWORD=AristoTest2024
DB_NAME=aristotest

# Frontend
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### Database Migrations
No new migrations required - existing tables support the feature.

### Build Commands
```bash
# Backend
cd backend
npm install
npm run build
npm run migrate
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

### Testing
1. Create test video with interactive layer
2. Access public URL
3. Complete full evaluation flow
4. Verify results saved correctly

## Troubleshooting

### Questions Not Visible
- Check z-index values in CSS
- Verify Portal rendering for mobile
- Ensure video player not blocking overlay

### Results Not Saving
- Check backend logs for errors
- Verify API endpoints accessible
- Check LocalStorage for backup data
- Ensure database tables exist

### Video Not Playing
- Verify MinIO server running
- Check CORS configuration
- Ensure HLS playlist accessible
- Test video URL directly

## Future Enhancements

1. Implement short answer questions
2. Add question hints/explanations
3. Support for branching scenarios
4. Offline mode with sync
5. Analytics dashboard
6. Accessibility improvements
7. Multiple language support