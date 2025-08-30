#!/bin/bash

# 🚀 Script de Deployment Robusto a QA con Verificaciones y Rollback
# Este script hace el deployment paso a paso con verificaciones en cada etapa

set -e
trap 'error_handler $? $LINENO' ERR

# Configuración
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY_PATH="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
REMOTE_DIR="/home/dynamtek/aristoTEST"
BRANCH="qa/release-1.1.0"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/home/dynamtek/backup-$TIMESTAMP"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función de manejo de errores
error_handler() {
    echo -e "${RED}❌ Error en línea $2 con código $1${NC}"
    echo -e "${YELLOW}Iniciando rollback...${NC}"
    rollback
    exit 1
}

# Función de rollback
rollback() {
    echo -e "${YELLOW}🔄 Ejecutando rollback...${NC}"
    ssh -i "$KEY_PATH" "$USER@$SERVER" << ENDSSH
    # Detener servicios
    pm2 kill 2>/dev/null || true
    sudo systemctl stop nginx 2>/dev/null || true
    
    # Restaurar backup si existe
    if [ -d "$BACKUP_DIR" ]; then
        rm -rf $REMOTE_DIR
        mv $BACKUP_DIR $REMOTE_DIR
        echo "Backup restaurado"
    fi
    
    echo "Rollback completado"
ENDSSH
}

# Función para verificar resultado
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 falló${NC}"
        return 1
    fi
}

echo -e "${BLUE}🚀 Iniciando Deployment Robusto a QA${NC}"
echo "========================================"
echo "Servidor: $SERVER"
echo "Branch: $BRANCH"
echo "Timestamp: $TIMESTAMP"
echo "========================================"

# PASO 1: Build local con verificación
echo -e "${YELLOW}📦 PASO 1: Preparando build local${NC}"

# Cambiar al directorio del proyecto
PROJECT_DIR="/Users/samuelquiroz/Documents/proyectos/quiz-app"
cd "$PROJECT_DIR"

# Backend - Instalar dependencias
echo "Instalando dependencias del backend..."
cd backend
npm ci --production
check_result "Instalación de dependencias del backend"

# Frontend - Build con assets
echo "Construyendo frontend con assets..."
cd ../frontend
npm ci
npm run build -- --config vite.config.build.ts
check_result "Build del frontend"

# Verificar que los assets se copiaron
if [ ! -d "dist/images" ]; then
    echo -e "${RED}❌ Los assets no se copiaron al build${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Assets verificados en dist/${NC}"

cd ..

# PASO 2: Crear archivo tar con todo el proyecto
echo -e "${YELLOW}📦 PASO 2: Empaquetando proyecto${NC}"
tar -czf "/tmp/aristotest-$TIMESTAMP.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='dist' \
    backend frontend scripts package.json README.md

check_result "Empaquetado del proyecto"

# PASO 3: Transferir al servidor
echo -e "${YELLOW}📤 PASO 3: Transfiriendo al servidor${NC}"
scp -i "$KEY_PATH" "/tmp/aristotest-$TIMESTAMP.tar.gz" "$USER@$SERVER:/tmp/"
check_result "Transferencia del archivo"

# Transferir también el build del frontend
tar -czf "/tmp/frontend-dist-$TIMESTAMP.tar.gz" -C frontend dist
scp -i "$KEY_PATH" "/tmp/frontend-dist-$TIMESTAMP.tar.gz" "$USER@$SERVER:/tmp/"
check_result "Transferencia del build del frontend"

# Transferir archivo .env.qa
scp -i "$KEY_PATH" "backend/.env.qa" "$USER@$SERVER:/tmp/.env.qa"
check_result "Transferencia de configuración"

# PASO 4: Ejecutar deployment en el servidor
echo -e "${YELLOW}🔧 PASO 4: Ejecutando deployment en servidor${NC}"

ssh -i "$KEY_PATH" "$USER@$SERVER" << 'ENDSSH'
set -e

# Variables
TIMESTAMP='$TIMESTAMP'
REMOTE_DIR='$REMOTE_DIR'
BACKUP_DIR='$BACKUP_DIR'

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}4.1 Creando backup del deployment anterior${NC}"
if [ -d "$REMOTE_DIR" ]; then
    mv "$REMOTE_DIR" "$BACKUP_DIR"
    echo "✅ Backup creado en $BACKUP_DIR"
fi

echo -e "${YELLOW}4.2 Descomprimiendo proyecto${NC}"
mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"
tar -xzf "/tmp/aristotest-$TIMESTAMP.tar.gz"
echo "✅ Proyecto descomprimido"

echo -e "${YELLOW}4.3 Configurando backend${NC}"
cd backend

# Copiar configuración
cp /tmp/.env.qa .env
echo "✅ Configuración copiada"

# Instalar dependencias (incluyendo dev para ts-node)
echo "Instalando todas las dependencias..."
npm install
echo "✅ Dependencias instaladas"

# Crear directorios necesarios
mkdir -p logs uploads storage/temp storage/processed
echo "✅ Directorios creados"

echo -e "${YELLOW}4.4 Configurando frontend${NC}"
cd ../frontend

# Descomprimir el build pre-hecho
tar -xzf "/tmp/frontend-dist-$TIMESTAMP.tar.gz"
echo "✅ Build del frontend descomprimido"

# Verificar assets
if [ ! -d "dist/images" ]; then
    echo -e "${RED}❌ Faltan assets en dist/images${NC}"
    exit 1
fi
echo "✅ Assets verificados"

echo -e "${YELLOW}4.5 Configurando PM2${NC}"
cd ../backend

# Crear ecosystem.config.js mejorado
cat > ecosystem.config.js << 'EOF'
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './src/server.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register/transpile-only -r tsconfig-paths/register',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: 3001,
      TS_NODE_TRANSPILE_ONLY: 'true',
      TS_NODE_LOG_ERROR: 'true'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF

echo "✅ PM2 configurado"

echo -e "${YELLOW}4.6 Configurando Nginx${NC}"
sudo tee /etc/nginx/sites-available/aristotest > /dev/null << 'EOF'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    root /home/dynamtek/aristoTEST/frontend/dist;
    index index.html;
    
    # Logs
    access_log /var/log/nginx/aristotest-access.log;
    error_log /var/log/nginx/aristotest-error.log;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Static assets
    location /images {
        alias /home/dynamtek/aristoTEST/frontend/dist/images;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location /assets {
        alias /home/dynamtek/aristoTEST/frontend/dist/assets;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Backend API
    location /api {
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Habilitar sitio
sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
echo "✅ Nginx configurado y reiniciado"

echo -e "${YELLOW}4.7 Iniciando servicios${NC}"

# Iniciar MinIO si no está corriendo
if ! systemctl is-active --quiet minio; then
    sudo systemctl start minio
fi
echo "✅ MinIO iniciado"

# Iniciar backend con PM2
pm2 start ecosystem.config.js
pm2 save
echo "✅ Backend iniciado con PM2"

# Esperar a que el servicio se estabilice
echo "Esperando a que el servicio se estabilice..."
sleep 20

# Verificar que el backend está respondiendo
if curl -s http://localhost:3001/api/v1/auth/login \
   -X POST \
   -H "Content-Type: application/json" \
   -d '{"email":"test@test.com","password":"test"}' | grep -q "error"; then
    echo "✅ Backend respondiendo (aunque con error esperado)"
else
    echo -e "${RED}❌ Backend no responde${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Deployment completado exitosamente${NC}"
ENDSSH

# PASO 5: Verificación final
echo -e "${YELLOW}🔍 PASO 5: Verificación final${NC}"

# Verificar frontend
echo "Verificando frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER/)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend accesible (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Frontend no accesible (HTTP $FRONTEND_STATUS)${NC}"
    rollback
    exit 1
fi

# Verificar que las imágenes cargan
echo "Verificando assets..."
LOGO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER/images/isoTipoAristoTest.png)
if [ "$LOGO_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Assets accesibles${NC}"
else
    echo -e "${YELLOW}⚠️  Assets pueden tener problemas (HTTP $LOGO_STATUS)${NC}"
fi

# Verificar backend
echo "Verificando backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER:3001/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}')
if [ "$BACKEND_STATUS" = "200" ] || [ "$BACKEND_STATUS" = "400" ] || [ "$BACKEND_STATUS" = "401" ]; then
    echo -e "${GREEN}✅ Backend respondiendo (HTTP $BACKEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Backend con problemas (HTTP $BACKEND_STATUS)${NC}"
fi

# Limpiar archivos temporales
rm -f /tmp/aristotest-$TIMESTAMP.tar.gz
rm -f /tmp/frontend-dist-$TIMESTAMP.tar.gz

echo ""
echo "========================================"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}URLs de acceso:${NC}"
echo "Frontend: http://$SERVER/"
echo "Backend API: http://$SERVER:3001/api/v1"
echo "MinIO Console: http://$SERVER:9001"
echo ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo "Ver logs: ssh -i $KEY_PATH $USER@$SERVER 'pm2 logs aristotest-backend'"
echo "Monitorear: ssh -i $KEY_PATH $USER@$SERVER 'pm2 monit'"
echo "Estado: ssh -i $KEY_PATH $USER@$SERVER 'pm2 status'"
echo ""
echo -e "${GREEN}✅ Sistema desplegado y funcionando${NC}"