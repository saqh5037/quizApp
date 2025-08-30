# Deployment Checklist for AristoTest v1.0.3

## Pre-Deployment Verification

### 1. Environment Configuration
- [ ] **Backend Port**: 3001 (ensure no conflict with existing deployment)
- [ ] **Frontend Port**: 5173 (development) / 80/443 (production)
- [ ] **PostgreSQL Port**: 5432
- [ ] **MinIO Ports**: 9000 (API), 9001 (Console)
- [ ] **Redis Port**: 6379 (if enabled)

### 2. Environment Variables
```bash
# Backend .env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=aristotest
DB_PASSWORD=AristoTest2024
DB_NAME=aristotest
JWT_SECRET=[SECURE_RANDOM_STRING]
JWT_REFRESH_SECRET=[SECURE_RANDOM_STRING]
GEMINI_API_KEY=[YOUR_API_KEY]
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos
CORS_ORIGIN=http://192.168.1.125:5173,https://your-domain.com
SOCKET_CORS_ORIGIN=http://192.168.1.125:5173,https://your-domain.com

# Frontend .env
VITE_API_URL=http://192.168.1.125:3001
VITE_SOCKET_URL=http://192.168.1.125:3001
```

### 3. Database Preparation
- [ ] Backup existing database
- [ ] Run migrations: `npm run migrate`
- [ ] Verify tables exist:
  - interactive_video_layers
  - interactive_video_results
  - interactive_video_answers
  - interactive_video_sessions

### 4. Dependencies Check
- [ ] Backend: `npm install --production`
- [ ] Frontend: `npm install`
- [ ] No vulnerabilities: `npm audit`

## Deployment Steps

### Step 1: Stop Current Services
```bash
# Stop existing AristoTest if running
pm2 stop aristotest-backend
pm2 stop aristotest-frontend
```

### Step 2: Deploy Backend
```bash
cd backend
npm install --production
npm run build
npm run migrate
pm2 start ecosystem.config.js --name aristotest-backend
```

### Step 3: Deploy Frontend
```bash
cd frontend
npm install
npm run build
# Serve with nginx or static server
pm2 serve dist 5173 --name aristotest-frontend --spa
```

### Step 4: Start Supporting Services
```bash
# Start MinIO if not running
./scripts/start-minio.sh

# Verify PostgreSQL is running
systemctl status postgresql
```

### Step 5: Nginx Configuration (if using)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Post-Deployment Verification

### 1. Service Health Checks
- [ ] Backend API: `curl http://localhost:3001/api/v1/health`
- [ ] Frontend: Access http://192.168.1.125:5173
- [ ] MinIO Console: http://localhost:9001
- [ ] Database: `psql -U aristotest -d aristotest -c "SELECT 1"`

### 2. Feature Testing
- [ ] Login with existing credentials
- [ ] Create a new quiz
- [ ] Upload a video
- [ ] Generate interactive layer for video
- [ ] Test public interactive video (complete flow)
- [ ] Verify results are saved
- [ ] Check results page

### 3. Interactive Video Testing
1. [ ] Access public video link
2. [ ] Complete student identification
3. [ ] Answer all questions
4. [ ] Verify results saved to database
5. [ ] Check LocalStorage backup (if network fails)

### 4. Performance Checks
- [ ] Page load time < 3 seconds
- [ ] Video streaming works smoothly
- [ ] Questions appear at correct timestamps
- [ ] No memory leaks in browser console

## Rollback Plan

### If Issues Occur:
1. **Stop new deployment**:
   ```bash
   pm2 stop aristotest-backend
   pm2 stop aristotest-frontend
   ```

2. **Restore previous version**:
   ```bash
   git checkout v1.0.2-QA
   npm install
   npm run build
   pm2 restart all
   ```

3. **Restore database** (if migrations were run):
   ```bash
   psql -U aristotest -d aristotest < backup.sql
   ```

## Known Issues & Workarounds

1. **Mobile Fullscreen Questions**: 
   - Issue: Questions may not display in fullscreen on some mobile devices
   - Workaround: Exit fullscreen to answer questions

2. **LocalStorage Backup**:
   - Results are saved to LocalStorage if server save fails
   - Check browser console for backup keys

3. **Port Conflicts**:
   - If port 3001 is in use, update PORT in backend .env
   - Update VITE_API_URL accordingly in frontend

## Monitoring

### Logs Location
- Backend: `pm2 logs aristotest-backend`
- Frontend: `pm2 logs aristotest-frontend`
- MinIO: `./storage/minio-data/.minio.sys/logs/`
- PostgreSQL: `/var/log/postgresql/`

### Key Metrics to Monitor
- API response time
- Database connection pool usage
- MinIO storage usage
- Error rate in pm2 logs
- Memory usage: `pm2 monit`

## Support Contacts

- Database Issues: Check PostgreSQL logs
- Video Issues: Verify MinIO is running
- AI Issues: Check GEMINI_API_KEY is valid
- Network Issues: Verify CORS settings

## Final Checklist

- [ ] All services running
- [ ] No errors in logs
- [ ] Features tested successfully
- [ ] Monitoring enabled
- [ ] Backup created
- [ ] Documentation updated
- [ ] Team notified of deployment

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Version**: v1.0.3 - Interactive Videos Enhanced
**Status**: [ ] Success [ ] Failed [ ] Partial