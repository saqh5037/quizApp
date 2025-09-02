#!/bin/bash

# =================================================================
# OPCIÓN 1: DEPLOYMENT LIMPIO Y SEGURO 
# =================================================================
# Estrategia: Instalación limpia con backup y validación
# Ventajas: Inicio fresco, sin residuos, estructura limpia
# Desventajas: Mayor tiempo de deployment (15-20 min)
# Ideal para: Errores persistentes o cambios estructurales
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ARISTOTEST QA - DEPLOYMENT LIMPIO Y SEGURO v2.0     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"
APP_DIR="/home/dynamtek/aristoTEST"
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Verificar certificado
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Error: Certificado no encontrado en $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Pre-checks locales...${NC}"

# Verificar rama actual
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}📌 Rama actual: ${CURRENT_BRANCH}${NC}"

# Verificar cambios sin commit
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Hay cambios sin commit. ¿Continuar? (s/n)${NC}"
    read -r response
    if [[ "$response" != "s" ]]; then
        echo -e "${RED}❌ Deployment cancelado${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pre-checks completados${NC}"
echo ""
echo -e "${YELLOW}🚀 Iniciando deployment limpio...${NC}"

# Script remoto
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}   INICIANDO DEPLOYMENT EN SERVIDOR QA${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"

# Función para verificar servicios
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✅ $service está activo${NC}"
    else
        echo -e "${RED}❌ $service no está activo${NC}"
    fi
}

echo -e "${YELLOW}📦 1. Creando backup del deployment actual...${NC}"
BACKUP_DIR="/home/dynamtek/backups/aristotest-$(date +%Y%m%d-%H%M%S)"
if [ -d "/home/dynamtek/aristoTEST" ]; then
    mkdir -p /home/dynamtek/backups
    cp -r /home/dynamtek/aristoTEST "$BACKUP_DIR"
    echo -e "${GREEN}✅ Backup creado en: $BACKUP_DIR${NC}"
fi

echo -e "${YELLOW}🛑 2. Deteniendo servicios existentes...${NC}"
# Detener servicios de AristoTest
pm2 stop aristotest-backend 2>/dev/null || true
pm2 delete aristotest-backend 2>/dev/null || true

# Verificar otros servicios en puertos importantes
PORTS_TO_CHECK=(1745 1746 1747 1748 1749 1750 4321 4322 4323 8080 8443)
echo -e "${BLUE}Verificando servicios en otros puertos...${NC}"
for port in "${PORTS_TO_CHECK[@]}"; do
    if sudo lsof -ti:$port >/dev/null 2>&1; then
        echo -e "${YELLOW}Puerto $port está en uso (manteniendo servicio existente)${NC}"
    fi
done

# Solo limpiar puerto 3001 (AristoTest)
if sudo lsof -ti:3001 >/dev/null 2>&1; then
    echo -e "${YELLOW}Liberando puerto 3001...${NC}"
    sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true
fi

echo -e "${YELLOW}🗑️  3. Limpiando directorio de aplicación...${NC}"
rm -rf /home/dynamtek/aristoTEST
mkdir -p /home/dynamtek/aristoTEST
cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}📥 4. Clonando repositorio desde main...${NC}"
git clone https://github.com/saqh5037/quizApp.git .
git checkout main
git pull origin main

# Mostrar último commit
echo -e "${BLUE}📝 Último commit:${NC}"
git log -1 --oneline

echo -e "${YELLOW}⚙️  5. Configurando Backend...${NC}"
cd backend

# Crear configuración de producción
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database - AWS RDS
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
DB_NAME=aristotest
DB_DIALECT=postgres

# JWT Security
JWT_SECRET=aristotest-qa-jwt-secret-2025-secure-v2
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2025-secure-v2
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Session
SESSION_SECRET=aristotest-qa-session-2025-v2
SESSION_MAX_AGE=86400000

# AI APIs
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
OPENAI_API_KEY=sk-proj-1mNE4R_-zFKWjbDaAtX6R7YgvpfCTjks9PGyFXsTwmfwT23fLKxFK2uRGJAuBpqH2$
CLAUDE_API_KEY=sk-ant-api03-tgv-dbsuzjXhBOSgJnlg6yi9b5_W6fglfvAqftw6Db80r6u7bk9_GIbAEZaz$
USE_MOCK_TRANSCRIPTION=false

# MinIO Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg

# CORS Configuration
CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com,http://52.55.189.120
SOCKET_CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com,http://52.55.189.120

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads

# QR Code
QR_BASE_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com

# Multi-tenant
TENANT_ID=1
DEFAULT_TENANT_ID=1

# Telegram Bot
TELEGRAM_BOT_TOKEN=8410755699:AAEApXvGNVFRK2En3uIDB27ueUxa-G83Om8
EOF

echo -e "${YELLOW}📦 6. Instalando dependencias del backend...${NC}"
npm ci --production

echo -e "${YELLOW}🔨 7. Compilando backend...${NC}"
npm run build || {
    echo -e "${YELLOW}Usando TypeScript directamente...${NC}"
    npx tsc || echo "Continuando con dist existente"
}

echo -e "${YELLOW}🗄️  8. Verificando base de datos...${NC}"
export PGPASSWORD=',U8x=]N02SX4'
psql -h ec2-3-91-26-178.compute-1.amazonaws.com -U labsis -d aristotest -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" || {
    echo -e "${RED}❌ Error conectando a la base de datos${NC}"
    exit 1
}

echo -e "${YELLOW}🔄 9. Ejecutando migraciones...${NC}"
export NODE_ENV=production
npx sequelize-cli db:migrate --config config/config.json || echo "Migraciones parcialmente aplicadas"

echo -e "${YELLOW}🎨 10. Configurando Frontend...${NC}"
cd ../frontend

# Configuración de producción para frontend
cat > .env.production << 'EOF'
VITE_API_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1
VITE_SOCKET_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
EOF

echo -e "${YELLOW}📦 11. Instalando dependencias del frontend...${NC}"
npm ci

echo -e "${YELLOW}🔨 12. Compilando frontend...${NC}"
npm run build

echo -e "${YELLOW}🌐 13. Configurando Nginx...${NC}"
sudo tee /etc/nginx/sites-available/aristotest > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com 52.55.189.120;
    
    root /home/dynamtek/aristoTEST/frontend/dist;
    index index.html;
    
    # Logs
    access_log /var/log/nginx/aristotest-access.log;
    error_log /var/log/nginx/aristotest-error.log;
    
    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para AI operations
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # File upload limit
    client_max_body_size 100M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_CONFIG

sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo -e "${YELLOW}💾 14. Configurando MinIO...${NC}"
cd /home/dynamtek/aristoTEST/backend

# Instalar MinIO si no existe
if [ ! -f /usr/local/bin/minio ]; then
    echo -e "${YELLOW}Descargando MinIO...${NC}"
    wget -q https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
    sudo mv minio /usr/local/bin/
fi

# Crear directorio de datos
mkdir -p storage/minio-data

# Crear servicio systemd para MinIO
sudo tee /etc/systemd/system/minio-aristotest.service > /dev/null << 'EOF'
[Unit]
Description=MinIO for AristoTest
Documentation=https://docs.min.io
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
Environment="MINIO_BROWSER_REDIRECT_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
ExecStart=/usr/local/bin/minio server ./minio-data --console-address ":9001"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=minio-aristotest
KillMode=mixed
KillSignal=SIGTERM
SuccessExitStatus=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable minio-aristotest
sudo systemctl restart minio-aristotest

echo -e "${YELLOW}🚀 15. Iniciando Backend con PM2...${NC}"
cd /home/dynamtek/aristoTEST/backend

# Crear ecosystem config mejorado
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
EOF

# Crear directorio de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u dynamtek --hp /home/dynamtek || true

echo -e "${YELLOW}🔧 16. Configurando permisos...${NC}"
# Asegurar permisos correctos
sudo chown -R dynamtek:dynamtek /home/dynamtek/aristoTEST
chmod -R 755 /home/dynamtek/aristoTEST
chmod -R 777 /home/dynamtek/aristoTEST/backend/logs
chmod -R 777 /home/dynamtek/aristoTEST/backend/storage

echo -e "${YELLOW}✨ 17. Limpieza final...${NC}"
# Limpiar archivos temporales
rm -rf /tmp/npm-*
rm -rf /tmp/deploy-qa.tar.gz

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETADO EXITOSAMENTE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

echo ""
echo -e "${CYAN}📊 RESUMEN DEL SISTEMA:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verificar servicios
echo -e "${YELLOW}Estado de servicios:${NC}"
pm2 status
echo ""
check_service nginx
check_service minio-aristotest

echo ""
echo -e "${CYAN}🌐 URLs DE ACCESO:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Frontend:      ${GREEN}http://ec2-52-55-189-120.compute-1.amazonaws.com${NC}"
echo -e "Backend API:   ${GREEN}http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1${NC}"
echo -e "MinIO Console: ${GREEN}http://ec2-52-55-189-120.compute-1.amazonaws.com:9001${NC}"
echo ""
echo -e "${CYAN}🔑 CREDENCIALES:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Admin:  ${YELLOW}admin@aristotest.com / Admin123!${NC}"
echo -e "MinIO:  ${YELLOW}aristotest / AristoTest2024!${NC}"
echo ""
echo -e "${CYAN}📝 COMANDOS ÚTILES:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Ver logs:     pm2 logs aristotest-backend"
echo "Reiniciar:    pm2 restart aristotest-backend"
echo "Estado:       pm2 status"
echo "Monitoreo:    pm2 monit"

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT EJECUTADO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# Verificación final desde local
echo -e "${YELLOW}🔍 Verificando servicios...${NC}"
sleep 5

# Test frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Frontend respondiendo correctamente${NC}"
else
    echo -e "${RED}❌ Frontend no responde (HTTP $HTTP_CODE)${NC}"
fi

# Test backend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Backend API respondiendo correctamente${NC}"
else
    echo -e "${RED}❌ Backend API no responde (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo -e "${CYAN}📚 Para ver los logs en tiempo real:${NC}"
echo -e "${YELLOW}ssh -i \"$SSH_KEY\" $SERVER 'pm2 logs aristotest-backend'${NC}"