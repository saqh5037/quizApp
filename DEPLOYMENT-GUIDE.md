# AristoTest - Deployment Guide for QA/Production

**Version:** 1.0.0-MVP  
**Date:** August 23, 2025  
**Author:** Claude Code Development Team

## 📋 Overview

This document provides complete instructions for deploying AristoTest in QA/Production environments on AWS or any Linux server.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │────│  (Node.js/TS)   │────│  (PostgreSQL)   │
│   Port: 5173    │    │   Port: 3001    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Prerequisites

### System Requirements
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **RAM:** Minimum 2GB, Recommended 4GB+
- **Storage:** Minimum 20GB SSD
- **Node.js:** v18.x or higher
- **PostgreSQL:** v14.x or higher
- **PM2:** For process management

### Required Ports
- **3001:** Backend API
- **5432:** PostgreSQL Database
- **80/443:** Web server (Nginx recommended)

## 📦 1. Database Setup

### Step 1: Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Configure Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE aristotest;
CREATE USER aristotest_app WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE aristotest TO aristotest_app;
\q
```

### Step 3: Run Migration Script
```bash
# Download the migration script
wget https://raw.githubusercontent.com/saqh5037/quizApp/main/database-migration-qa.sql

# Run migration
psql -h localhost -d aristotest -U aristotest_app -f database-migration-qa.sql
```

## 🔧 2. Backend Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/saqh5037/quizApp.git
cd quizApp/backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Configuration
```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

#### Required Environment Variables:
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=aristotest_app
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
SOCKET_CORS_ORIGIN=https://your-domain.com

# File Upload (optional)
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# Email Configuration (optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=noreply@your-domain.com

# Frontend URL
FRONTEND_URL=https://your-domain.com
QR_BASE_URL=https://your-domain.com/quiz
```

### Step 4: Build and Start
```bash
# Build the application
npm run build

# Install PM2 globally
sudo npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name "aristotest-backend"
pm2 startup
pm2 save
```

## 🌐 3. Frontend Setup

### Step 1: Navigate to Frontend
```bash
cd ../frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Production Environment
```bash
# The .env.production file is already configured for relative URLs
# Update if needed:
nano .env.production
```

### Step 4: Build for Production
```bash
# Build the frontend
npm run build
```

## 🔧 4. Web Server Configuration (Nginx)

### Step 1: Install Nginx
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### Step 2: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/aristotest
```

#### Nginx Configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS (optional but recommended)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (configure with your certificates)
    # ssl_certificate /path/to/your/certificate.pem;
    # ssl_certificate_key /path/to/your/private.key;
    
    root /path/to/quizApp/frontend/dist;
    index index.html;
    
    # Frontend - serve static files
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### Step 3: Enable Site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔍 5. Health Checks and Monitoring

### Backend Health Check
```bash
curl http://localhost:3001/api/v1/health
```

### Database Connection Test
```bash
# Test database connection
psql -h localhost -d aristotest -U aristotest_app -c "SELECT NOW();"
```

### PM2 Monitoring
```bash
# View status
pm2 status

# View logs
pm2 logs aristotest-backend

# Monitor resources
pm2 monit
```

## 🔒 6. Security Configuration

### Firewall Setup
```bash
# Ubuntu - UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# CentOS - firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### PostgreSQL Security
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Set listen_addresses (if needed)
# listen_addresses = 'localhost'

# Edit access control
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📊 7. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🧪 8. Testing the Deployment

### Frontend Tests
1. Visit `https://your-domain.com`
2. Login with test credentials:
   - **Admin:** admin@aristotest.com / Admin123!@#
   - **Teacher:** teacher@aristotest.com / Teacher123!
   - **Student:** student@aristotest.com / Student123!

### Backend API Tests
```bash
# Test API endpoints
curl -X GET "https://your-domain.com/api/v1/health"
curl -X POST "https://your-domain.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aristotest.com","password":"Admin123!@#"}'
```

### Feature Testing Checklist
- [ ] User authentication (login/logout)
- [ ] Quiz creation and editing
- [ ] Quiz taking functionality
- [ ] Real-time sessions
- [ ] Results viewing
- [ ] PDF certificate generation
- [ ] Dashboard metrics
- [ ] Public quiz access via QR codes

## 🔄 9. Backup and Maintenance

### Database Backups
```bash
# Create backup script
cat > /home/ubuntu/backup_db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U aristotest_app aristotest > /home/ubuntu/backups/aristotest_$DATE.sql
find /home/ubuntu/backups -name "aristotest_*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup_db.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup_db.sh
```

### Log Rotation
```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
```

## 🚨 10. Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check logs
pm2 logs aristotest-backend

# Check environment variables
cat .env.production

# Test database connection
npm run test:db
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -d aristotest -U aristotest_app
```

#### Frontend 404 Errors
- Ensure `try_files $uri $uri/ /index.html;` is in Nginx config
- Check file permissions: `sudo chown -R www-data:www-data /path/to/frontend/dist`

### Performance Issues
- Check PM2 memory usage: `pm2 monit`
- Monitor database queries: Enable slow query log
- Check Nginx access logs: `tail -f /var/log/nginx/access.log`

## 📞 Support

For technical support or questions about deployment:

1. **Check Documentation:** `/docs` endpoint in the application
2. **Review Logs:** PM2 and Nginx logs
3. **Database Issues:** Check PostgreSQL logs
4. **GitHub Issues:** https://github.com/saqh5037/quizApp/issues

## 🎯 Production Checklist

Before going live, ensure:

- [ ] All environment variables are configured
- [ ] Database migration completed successfully
- [ ] SSL certificates installed and working
- [ ] Backups scheduled and tested
- [ ] Monitoring configured
- [ ] Security headers implemented
- [ ] Firewall configured
- [ ] Performance tested under load
- [ ] All features tested manually
- [ ] Error monitoring configured

---

**🎉 Congratulations! AristoTest MVP is now deployed and ready for QA testing.**

Remember to update DNS records to point to your server and configure any CDN if needed for global performance.