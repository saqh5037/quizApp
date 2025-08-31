# AristoTest QA Deployment Guide v2.0
**Date:** August 31, 2024  
**Branch:** main  
**Environment:** AWS EC2 QA Server

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)
```bash
chmod +x deploy-qa-complete.sh
./deploy-qa-complete.sh
```

### Option 2: Manual SSH Deployment
```bash
ssh -i ~/.ssh/sam-demo-aws.pem ec2-user@18.206.119.156
# Then execute the deployment script remotely
```

## 📋 Server Information

### EC2 Instance
- **Public IP:** 18.206.119.156
- **Public DNS:** ec2-18-206-119-156.compute-1.amazonaws.com
- **Instance Type:** t2.medium
- **Region:** us-east-1
- **OS:** Amazon Linux 2

### Database (RDS)
- **Host:** aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com
- **Database Name:** aristotest2 ⚠️ (NOT aristotest)
- **Port:** 5432
- **Username:** aristotest
- **Password:** AristoTest2024

## 🆕 Latest Changes in Main Branch

### New Features
1. **Educational Resources Center**
   - Study guides generation from manuals
   - Practice questions with AI
   - Flashcards system
   - Key concepts extraction
   
2. **Enhanced Interactive Videos**
   - Fixed transcription to use real audio (not mock data)
   - Improved fullscreen support
   - Mobile responsive design
   - Better question overlay positioning

3. **Database Updates**
   - New tables for educational resources:
     - `study_guides`
     - `flashcards`
     - `practice_questions`
     - `key_concepts`
   - Migration: `20250831-create-educational-resource-tables.js`

### Critical Fixes Applied
- ✅ Video transcription now uses actual audio via Gemini AI
- ✅ Trust proxy configuration for Nginx
- ✅ Module alias resolution in production
- ✅ Interactive video layer generation
- ✅ Rate limiting with proper headers

## 🔧 Configuration Files

### Backend Environment (.env.production)
```env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com
DB_NAME=aristotest2
DB_USER=aristotest
DB_PASSWORD=AristoTest2024

# JWT
JWT_SECRET=aristotest-qa-jwt-secret-2024-secure
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2024-secure

# AI
GEMINI_API_KEY=AIzaSyDczOPJzs8Z5RCLrxxC6I9EVG-2P42MzHE
USE_MOCK_TRANSCRIPTION=false

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!

# Tenant
TENANT_ID=1
DEFAULT_TENANT_ID=1
```

### Frontend Environment (.env.production)
```env
VITE_API_URL=http://ec2-18-206-119-156.compute-1.amazonaws.com/api/v1
VITE_SOCKET_URL=http://ec2-18-206-119-156.compute-1.amazonaws.com
```

## 📊 Database Migrations

### Recent Migrations to Apply
```bash
# Connect to database
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest2 -h aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com

# Run migrations
cd /var/www/aristotest-qa-backend
npx sequelize-cli db:migrate --env production
```

### Key Tables Added
- Educational Resources (study_guides, flashcards, practice_questions, key_concepts)
- Interactive Videos (interactive_video_layers, interactive_video_results, interactive_video_answers)
- AI Features (ai_generated_quizzes, manual_chats, manual_summaries)
- Manuals (manuals with text extraction)

## 🚦 Service Management

### Start Services
```bash
# Backend
pm2 start aristotest-qa-backend

# MinIO
sudo systemctl start minio

# Nginx
sudo systemctl start nginx
```

### Monitor Services
```bash
# Check all services
pm2 status

# View logs
pm2 logs aristotest-qa-backend

# MinIO logs
sudo journalctl -u minio -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
pm2 restart aristotest-qa-backend
sudo systemctl restart nginx
sudo systemctl restart minio
```

## 🔍 Verification Steps

### 1. Check Frontend
```bash
curl -I http://ec2-18-206-119-156.compute-1.amazonaws.com
```

### 2. Check Backend API
```bash
curl http://ec2-18-206-119-156.compute-1.amazonaws.com/api/v1/health
```

### 3. Check Database Connection
```bash
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest2 \
  -h aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com \
  -c "SELECT COUNT(*) FROM users;"
```

### 4. Check MinIO
```bash
curl http://localhost:9000/minio/health/live
```

### 5. Test Login
```bash
curl -X POST http://ec2-18-206-119-156.compute-1.amazonaws.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aristotest.com","password":"admin123"}'
```

## 🌐 Access URLs

### Application
- **Frontend:** http://ec2-18-206-119-156.compute-1.amazonaws.com
- **API:** http://ec2-18-206-119-156.compute-1.amazonaws.com/api/v1
- **Socket.io:** http://ec2-18-206-119-156.compute-1.amazonaws.com/socket.io
- **MinIO Console:** http://ec2-18-206-119-156.compute-1.amazonaws.com:9001

### Default Credentials
- **Admin User:** admin@aristotest.com / admin123
- **MinIO:** aristotest / AristoTest2024!

## ⚠️ Important Notes

1. **Database Name:** Always use `aristotest2`, NOT `aristotest`
2. **Trust Proxy:** Enabled for Nginx reverse proxy
3. **Transcription:** Real audio transcription enabled (USE_MOCK_TRANSCRIPTION=false)
4. **File Uploads:** Max size 100MB
5. **Rate Limiting:** 100 requests per 15 minutes

## 🐛 Troubleshooting

### Module Not Found Error
```bash
cd /var/www/aristotest-qa-backend
node -r ./register-aliases.js dist/server.js
```

### Database Connection Issues
```bash
# Test connection
nc -zv aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com 5432

# Check credentials
echo $DB_PASSWORD
```

### MinIO Not Starting
```bash
# Check if port 9000 is in use
sudo lsof -i :9000

# Restart MinIO
sudo systemctl restart minio
sudo systemctl status minio
```

### Nginx 502 Bad Gateway
```bash
# Check if backend is running
pm2 status aristotest-qa-backend

# Check backend logs
pm2 logs aristotest-qa-backend --lines 50

# Restart backend
pm2 restart aristotest-qa-backend
```

## 📦 Backup & Restore

### Create Backup
```bash
# Database backup
PGPASSWORD=AristoTest2024 pg_dump -U aristotest -h aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com \
  aristotest2 > backup-$(date +%Y%m%d-%H%M%S).sql

# Application backup
tar -czf aristotest-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /var/www/aristotest-qa-backend \
  /var/www/aristotest-qa-frontend
```

### Restore from Backup
```bash
# Database restore
PGPASSWORD=AristoTest2024 psql -U aristotest -h aristotest-qa-db.cvynqp7xo6mw.us-east-1.rds.amazonaws.com \
  aristotest2 < backup.sql

# Application restore
tar -xzf aristotest-backup.tar.gz -C /
```

## 📝 Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Can login with admin credentials
- [ ] Database migrations completed
- [ ] MinIO is accessible
- [ ] Can upload files/videos
- [ ] Interactive videos work with real transcription
- [ ] Educational resources are accessible
- [ ] Socket.io real-time features work
- [ ] Quiz sessions can be created and joined
- [ ] API rate limiting is functional

## 🔄 Update Process

To deploy new changes from GitHub:

```bash
# SSH into server
ssh -i ~/.ssh/sam-demo-aws.pem ec2-user@18.206.119.156

# Navigate to backend
cd /var/www/aristotest-qa-backend

# Pull latest changes
git pull origin main

# Install dependencies if needed
npm install

# Build
npm run build

# Run migrations
npx sequelize-cli db:migrate --env production

# Restart services
pm2 restart aristotest-qa-backend

# For frontend updates
cd /var/www/aristotest-qa-frontend
git pull origin main
npm install
npm run build
```

## 📞 Support

For issues or questions:
- Check logs: `pm2 logs aristotest-qa-backend`
- Database issues: Verify RDS security groups and credentials
- Network issues: Check EC2 security groups (ports 80, 443, 3001, 9000, 9001)

---

**Last Updated:** August 31, 2024  
**Version:** 2.0.0  
**Maintained by:** DevOps Team