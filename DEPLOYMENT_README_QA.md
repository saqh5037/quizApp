# AristoTest QA Deployment Guide

## Server Information
- **Server**: ec2-52-55-189-120.compute-1.amazonaws.com
- **User**: dynamtek
- **Path**: /home/dynamtek/aristoTEST
- **Database**: ec2-3-91-26-178.compute-1.amazonaws.com/aristotest1

## Port Configuration
- **Frontend**: 80 (Nginx)
- **Backend API**: 3001
- **MinIO Storage**: 9000
- **MinIO Console**: 9001

## Quick Deployment

### 1. Make scripts executable
```bash
chmod +x deploy-qa.sh
chmod +x deploy-qa-env.sh
```

### 2. Run deployment
```bash
./deploy-qa.sh
```

This script will:
- Create backup of existing deployment
- Build frontend and backend
- Upload to server
- Install dependencies
- Configure environment
- Run database migrations
- Start services with PM2
- Configure Nginx

## Manual Deployment Steps

### 1. Connect to server
```bash
ssh -i "/Users/samuelquiroz/Desktop/certificados/labsisapp.pem" \
    dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com
```

### 2. Check running services
```bash
pm2 list
# Look for other services to avoid conflicts
```

### 3. Stop existing AristoTest (if running)
```bash
pm2 stop aristotest-backend aristotest-frontend
pm2 delete aristotest-backend aristotest-frontend
```

### 4. Create backup
```bash
cd /home/dynamtek
tar -czf aristotest_backup_$(date +%Y%m%d_%H%M%S).tar.gz aristoTEST/
```

### 5. Deploy new code
```bash
cd /home/dynamtek/aristoTEST

# Pull latest code (if using git)
git pull origin aristoTest250830

# Or upload files manually via SCP
```

### 6. Install dependencies
```bash
cd backend
npm install --production

# No need to install frontend dependencies if using pre-built dist
```

### 7. Run database setup
```bash
PGPASSWORD=',U8x=]N02SX4' psql \
  -h ec2-3-91-26-178.compute-1.amazonaws.com \
  -U labsis \
  -d aristotest1 \
  -f deploy-qa-db.sql
```

### 8. Setup environment
```bash
cd /home/dynamtek/aristoTEST
./deploy-qa-env.sh
```

### 9. Start services
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # If not already configured
```

### 10. Configure Nginx
```bash
sudo cp nginx-qa.conf /etc/nginx/sites-available/aristotest
sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Service Management

### Check status
```bash
pm2 status
pm2 logs aristotest-backend
pm2 logs aristotest-frontend
pm2 logs minio
```

### Restart services
```bash
pm2 restart aristotest-backend
pm2 restart aristotest-frontend
pm2 restart all
```

### Monitor resources
```bash
pm2 monit
htop
df -h  # Check disk space
```

## Database Management

### Connect to database
```bash
PGPASSWORD=',U8x=]N02SX4' psql \
  -h ec2-3-91-26-178.compute-1.amazonaws.com \
  -U labsis \
  -d aristotest1
```

### Common queries
```sql
-- Check tables
\dt

-- Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM videos;
SELECT COUNT(*) FROM interactive_video_results;

-- Check recent activity
SELECT * FROM interactive_video_results 
ORDER BY created_at DESC 
LIMIT 10;
```

### Backup database
```bash
PGPASSWORD=',U8x=]N02SX4' pg_dump \
  -h ec2-3-91-26-178.compute-1.amazonaws.com \
  -U labsis \
  -d aristotest1 \
  > aristotest_backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs aristotest-backend --lines 100

# Check port availability
sudo lsof -i :3001

# Test database connection
PGPASSWORD=',U8x=]N02SX4' psql \
  -h ec2-3-91-26-178.compute-1.amazonaws.com \
  -U labsis \
  -d aristotest1 \
  -c "SELECT 1"
```

### Frontend not accessible
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/aristotest_error.log

# Test frontend directly
curl http://localhost:80
```

### MinIO issues
```bash
# Check MinIO logs
pm2 logs minio

# Test MinIO access
curl http://localhost:9000/minio/health/live

# Check storage space
df -h /home/dynamtek/aristoTEST/backend/storage
```

### Socket.io connection issues
```bash
# Check if socket.io is accessible
curl http://localhost:3001/socket.io/

# Check CORS configuration in backend .env
cat /home/dynamtek/aristoTEST/backend/.env | grep CORS
```

## Monitoring URLs

After deployment, access:
- **Frontend**: http://52.55.189.120
- **Backend API**: http://52.55.189.120:3001/api/v1/health
- **MinIO Console**: http://52.55.189.120:9001
  - Username: aristotest
  - Password: AristoTest2024!

## Rollback Procedure

If something goes wrong:

1. **Stop new services**
```bash
pm2 stop all
```

2. **Restore backup**
```bash
cd /home/dynamtek
rm -rf aristoTEST
tar -xzf aristotest_backup_[DATE].tar.gz
```

3. **Restart old services**
```bash
cd aristoTEST
pm2 start ecosystem.config.js
```

## Security Notes

1. **Sensitive files**: Ensure `.env` files have proper permissions (600)
2. **API Keys**: All API keys are stored in environment variables
3. **Database**: Only accessible from specific IPs
4. **Ports**: Only required ports are open in security group

## Performance Optimization

1. **PM2 Cluster Mode** (if needed):
```javascript
// In ecosystem.config.js
instances: 'max',  // or specific number
exec_mode: 'cluster'
```

2. **Nginx Caching**:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

3. **Database Connection Pool**:
Already configured in backend with optimal settings

## Logs Location

- **PM2 Logs**: `/home/dynamtek/aristoTEST/logs/`
- **Nginx Logs**: `/var/log/nginx/aristotest_*.log`
- **System Logs**: `journalctl -u nginx`

## Contact for Issues

If you encounter issues:
1. Check logs first
2. Verify all services are running
3. Ensure database is accessible
4. Check disk space and memory

## Version Information
- **Current Version**: 1.0.3
- **Branch**: aristoTest250830
- **Features**: Interactive Videos with Zustand State Management

---

**Last Updated**: August 30, 2025
**Deployment Script Version**: 1.0.0