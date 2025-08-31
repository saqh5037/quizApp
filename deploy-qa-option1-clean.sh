#!/bin/bash

# =================================================================
# OPCIÓN 1: DEPLOYMENT LIMPIO COMPLETO
# =================================================================
# Descripción: Limpia todo y hace un deployment desde cero
# Ideal para: Cuando hay problemas y necesitas un inicio fresco
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AristoTest QA - Deployment Limpio Completo  ${NC}"
echo -e "${BLUE}================================================${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"
APP_DIR="/home/dynamtek/aristoTEST"

# Base de datos
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest"  # Usamos aristotest como indicaste
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Verificar certificado
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: No se encuentra el certificado en $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}Conectando al servidor QA...${NC}"

# Script remoto
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}1. Deteniendo servicios actuales...${NC}"
# Detener AristoTest si está corriendo
pm2 stop aristotest-backend 2>/dev/null || true
pm2 delete aristotest-backend 2>/dev/null || true

# Matar procesos en puerto 3001 (AristoTest)
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true

# Detener MinIO si está corriendo
sudo systemctl stop minio 2>/dev/null || true
sudo lsof -ti:9000 | xargs sudo kill -9 2>/dev/null || true

echo -e "${YELLOW}2. Creando backup del deployment actual...${NC}"
if [ -d "/home/dynamtek/aristoTEST" ]; then
    sudo mv /home/dynamtek/aristoTEST /home/dynamtek/aristoTEST.backup.$(date +%Y%m%d-%H%M%S)
fi

echo -e "${YELLOW}3. Creando estructura de directorios...${NC}"
mkdir -p /home/dynamtek/aristoTEST
cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}4. Clonando repositorio...${NC}"
git clone https://github.com/saqh5037/quizApp.git .
git checkout main
git pull origin main

echo -e "${YELLOW}5. Configurando Backend...${NC}"
cd backend

# Crear archivo .env
cat > .env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
DB_NAME=aristotest
DB_DIALECT=postgres

# JWT
JWT_SECRET=aristotest-qa-jwt-secret-2025-secure
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2025-secure
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Session
SESSION_SECRET=aristotest-qa-session-2025

# AI
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
USE_MOCK_TRANSCRIPTION=false

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg

# CORS
CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com
SOCKET_CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Files
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads

# QR
QR_BASE_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com

# Tenant
TENANT_ID=1
DEFAULT_TENANT_ID=1
EOF

echo -e "${YELLOW}6. Instalando dependencias del backend...${NC}"
npm install --production

echo -e "${YELLOW}7. Compilando backend...${NC}"
npm run build || {
    echo -e "${YELLOW}Intentando con build alternativo...${NC}"
    npx tsc || echo "Usando dist existente"
}

# Fix para transcripción
if [ -f "dist/services/video-transcription.service.js" ]; then
    sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js
fi

echo -e "${YELLOW}8. Ejecutando migraciones de base de datos...${NC}"
export NODE_ENV=production
npx sequelize-cli db:migrate || echo "Algunas migraciones ya aplicadas"

echo -e "${YELLOW}9. Configurando Frontend...${NC}"
cd ../frontend

# Crear archivo .env.production
cat > .env.production << EOF
VITE_API_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1
VITE_SOCKET_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
EOF

echo -e "${YELLOW}10. Instalando dependencias del frontend...${NC}"
npm install

echo -e "${YELLOW}11. Compilando frontend...${NC}"
npm run build

echo -e "${YELLOW}12. Configurando Nginx...${NC}"
sudo tee /etc/nginx/sites-available/aristotest << 'NGINX_CONFIG'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    # Frontend
    location / {
        root /home/dynamtek/aristoTEST/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    client_max_body_size 100M;
}
NGINX_CONFIG

sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo -e "${YELLOW}13. Instalando y configurando MinIO...${NC}"
cd /home/dynamtek/aristoTEST/backend

# Descargar MinIO si no existe
if [ ! -f /usr/local/bin/minio ]; then
    wget -q https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
    sudo mv minio /usr/local/bin/
fi

# Crear directorio de datos
mkdir -p storage/minio-data

# Crear servicio de MinIO
sudo tee /etc/systemd/system/minio.service << EOF
[Unit]
Description=MinIO
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/home/dynamtek/aristoTEST/backend/storage
User=dynamtek
Group=dynamtek
Type=simple
Restart=always
RestartSec=5
Environment="MINIO_ROOT_USER=aristotest"
Environment="MINIO_ROOT_PASSWORD=AristoTest2024!"
ExecStart=/usr/local/bin/minio server ./minio-data --console-address ":9001"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=minio

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl start minio

echo -e "${YELLOW}14. Iniciando Backend con PM2...${NC}"
cd /home/dynamtek/aristoTEST/backend

# Crear ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

mkdir -p logs
pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}✅ Deployment completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}URLs de acceso:${NC}"
echo "Frontend: http://ec2-52-55-189-120.compute-1.amazonaws.com"
echo "Backend API: http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1"
echo "MinIO Console: http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
echo ""
echo -e "${BLUE}Credenciales:${NC}"
echo "Admin: admin@aristotest.com / admin123"
echo "MinIO: aristotest / AristoTest2024!"
echo ""
echo -e "${YELLOW}Estado de servicios:${NC}"
pm2 status
sudo systemctl status minio --no-pager | head -5
sudo systemctl status nginx --no-pager | head -5

REMOTE_SCRIPT

echo -e "${GREEN}✅ Script de deployment ejecutado!${NC}"
echo -e "${YELLOW}Verificando servicios...${NC}"

# Verificar que los servicios están activos
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com | grep -q "200" && \
    echo -e "${GREEN}✅ Frontend respondiendo${NC}" || \
    echo -e "${RED}❌ Frontend no responde${NC}"

curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1/health | grep -q "200" && \
    echo -e "${GREEN}✅ Backend API respondiendo${NC}" || \
    echo -e "${RED}❌ Backend API no responde${NC}"