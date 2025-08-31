# Educational Resources Module - Complete Documentation

## Overview
The Educational Resources module provides AI-powered educational content generation from PDF manuals. It creates three types of resources: AI Summaries, Study Guides, and Interactive Flash Cards.

## Features

### 1. AI Summaries (Resúmenes IA)
- **Brief**: 2-3 paragraph overview of key points
- **Detailed**: Comprehensive coverage of all sections
- **Key Points**: Structured list of main concepts

### 2. Study Guides (Guías de Estudio)
- **Difficulty Levels**: Beginner, Intermediate, Advanced
- **Components**: Learning objectives, topics, estimated time
- **Content**: Structured educational material with exercises

### 3. Flash Cards (Tarjetas Interactivas)
- **Interactive Study**: Front/back card format
- **Categories**: Organized by topics
- **Tracking**: Study statistics and progress

## Database Setup

### Prerequisites
- PostgreSQL 12+
- Node.js 16+
- Gemini API key configured

### Installation

1. **Create the database tables:**
```bash
cd backend
./deploy-educational-resources.sh
```

2. **For manual SQL execution:**
```sql
-- Run the contents of:
backend/scripts/create-educational-resources-tables.sql
```

3. **Verify installation:**
```bash
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -d aristotest -c "\dt study_guides"
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -d aristotest -c "\dt flash_cards"
```

## API Endpoints

### Generate Educational Resource
```
POST /api/v1/educational-resources/manuals/:manualId/resources
```

**Request Body:**
```json
{
  "contentType": "summary|study_guide|flash_cards",
  "title": "Resource Title",
  "description": "Optional description",
  
  // For summaries
  "summaryType": "brief|detailed|key_points",
  
  // For study guides
  "difficultyLevel": "beginner|intermediate|advanced",
  "estimatedTime": 30,
  "learningObjectives": ["Objective 1", "Objective 2"],
  
  // For flash cards
  "cardCount": 10,
  "cardDifficulty": "easy|medium|hard",
  "categories": ["Category 1", "Category 2"],
  
  // General options
  "isPublic": false,
  "customPrompt": "Optional custom instructions"
}
```

### Get Resource
```
GET /api/v1/educational-resources/resources/:resourceType/:resourceId
```

### List Manual Resources
```
GET /api/v1/educational-resources/manuals/:manualId/resources
```

### Update Flash Card Statistics
```
PATCH /api/v1/educational-resources/flash-cards/:flashCardId/stats
```

## Frontend Usage

### Access Points

1. **From Manual Detail Page:**
   - Click "Ver Recursos" to view existing resources
   - Click "Generar Recursos IA" to create new resources

2. **Direct URLs:**
   - View resources: `/manuals/:manualId/resources`
   - Generate resources: `/manuals/:manualId/generate-summary`
   - View specific resource: `/resources/:resourceType/:resourceId`

### User Flow

1. **Upload Manual** → Process PDF text extraction
2. **Generate Resource** → Select type and configure options
3. **AI Processing** → Gemini generates content asynchronously
4. **View & Share** → Access generated resources

## Configuration

### Environment Variables
```env
# Required
GEMINI_API_KEY=your-gemini-api-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=aristotest
DB_PASSWORD=AristoTest2024
```

### Gemini Model
Currently using: `gemini-1.5-flash`
Location: `backend/src/services/gemini.service.ts`

## Troubleshooting

### Common Issues

1. **404 Error - Tables don't exist:**
   ```bash
   # Run the deployment script
   ./deploy-educational-resources.sh
   ```

2. **500 Error - Gemini API:**
   - Check GEMINI_API_KEY is set
   - Verify API quota hasn't been exceeded
   - Check network connectivity

3. **Resource stuck in "generating" status:**
   - Check backend logs for errors
   - Verify Gemini service is responding
   - Manual content might be too large (split into smaller sections)

4. **Authentication errors:**
   - Ensure user is logged in
   - Check JWT token is valid
   - Verify tenant context is set

### Database Verification
```bash
# Check tables exist
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -d aristotest -c "\dt"

# Check manual exists
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -d aristotest \
  -c "SELECT id, title FROM manuals WHERE id = 6;"

# Check generated resources
PGPASSWORD=AristoTest2024 psql -U aristotest -h localhost -d aristotest \
  -c "SELECT id, title, status FROM manual_summaries WHERE manual_id = 6;"
```

## Production Deployment

### Pre-deployment Checklist

1. ✅ Run database migrations on production
2. ✅ Configure Gemini API key
3. ✅ Set up proper authentication
4. ✅ Configure rate limiting for AI endpoints
5. ✅ Set up monitoring for generation queue
6. ✅ Configure backup for generated content

### Deployment Steps

1. **Database Migration:**
```bash
# On production server
psql -U prod_user -h prod_host -d prod_db -f scripts/create-educational-resources-tables.sql
```

2. **Backend Deployment:**
```bash
npm run build
npm run start:prod
```

3. **Frontend Build:**
```bash
npm run build
# Deploy dist/ folder to CDN/server
```

## API Rate Limiting

Recommended limits for AI endpoints:
- Generate resource: 10 requests per minute per user
- Get resource: 100 requests per minute
- List resources: 50 requests per minute

## Security Considerations

1. **Data Privacy:**
   - Resources inherit manual's privacy settings
   - Public resources accessible via direct link only
   - Private resources require authentication

2. **Input Validation:**
   - Sanitize custom prompts
   - Validate content type and options
   - Limit resource size

3. **Access Control:**
   - Users can only generate resources for their manuals
   - Tenant isolation enforced
   - Admin override available

## Monitoring

### Key Metrics
- Resource generation success rate
- Average generation time
- Gemini API usage
- User engagement with resources

### Logs to Monitor
```bash
# Backend logs
tail -f backend/logs/app.log | grep "educational-resources"

# Gemini service logs
tail -f backend/logs/app.log | grep "GeminiService"
```

## Future Enhancements

1. **Batch Generation:** Generate multiple resource types at once
2. **Templates:** Pre-configured resource templates
3. **Collaboration:** Share and collaborate on resources
4. **Analytics:** Track learning progress and effectiveness
5. **Export:** Download resources as PDF/DOCX
6. **Mobile App:** Native mobile experience for flash cards

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Verify database connectivity
4. Check Gemini API status

## Version History

- **v1.0.0** (2024-08-31): Initial release
  - AI Summaries
  - Study Guides
  - Flash Cards
  - Public/Private sharing
  - Multi-tenant support